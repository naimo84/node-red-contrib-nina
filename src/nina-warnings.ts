

import { CronJob } from 'cron';
import * as parser from 'cron-parser';
import { NodeMessageInFlow, NodeMessage } from "node-red";
import got from 'got';
var debug = require('debug')('nina-warnings');

function delay(ms: number) {
    return new Promise<void>(resolve => {
        setTimeout(resolve, ms)
    })
}
module.exports = function (RED: any) {
    function warningsNode(config: any) {
        RED.nodes.createNode(this, config);
        let node = this;
        this.risks = {};
        this.risksold = {};
        this.state = {};
        this.etags = {};
        this.lastMods = {};

        try {
            node.on('input', async (msg, send, done) => {
                node.msg = RED.util.cloneMessage(msg);
                send = send || function () { node.send.apply(node, arguments) }
                cronCheckJob(node, msg, send, done, config);
                await delay(1000)
                node.status({})
            });

            let cron = '';
            if (config.timeout && config.timeout !== '' && parseInt(config.timeout) > 0 && config.timeoutUnits && config.timeoutUnits !== '') {
                switch (config.timeoutUnits) {
                    case 'seconds':
                        cron = `*/${config.timeout} * * * * *`;
                        break;
                    case 'minutes':
                        cron = `0 */${config.timeout} * * * *`;
                        break;
                    case 'hours':
                        cron = `0 0 */${config.timeout} * * *`;
                        break;
                    case 'days':
                        cron = `0 0 0 */${config.timeout} * *`;
                        break;
                    default:
                        break;
                }
            }
            if (config.cron && config.cron !== '') {
                parser.parseExpression(config.cron);
                cron = config.cron;
            }

            if (cron !== '') {
                node.job = new CronJob(cron, function () { node.emit("input", {}); });
                node.job.start();

                node.on('close', () => {
                    node.job.stop();
                });
            }

        }
        catch (err) {
            node.error('Error: ' + err.message);

        }
    }

    async function cronCheckJob(node, msg: NodeMessageInFlow, send: (msg: NodeMessage | NodeMessage[]) => void, done: (err?: Error) => void, config) {
        let agsArray = [];
        if (config.agsArray) {
            agsArray = config.agsArray.replace(/ /g, "").split(",");
            agsArray.forEach((ags, index) => {
                if (ags.length > 5) {
                    agsArray[index] = ags.slice(0, 5);
                }
            });
        }

        try {
            for (const element of agsArray) {
                if (node.risks[element]) {
                    node.risksold[element] = node.risks[element];
                }
                node.risks[element] = [];
                await checkStatus(element, node);
                await getWarnings(element, config, node);
            }
        }
        catch (err) {
            if (err && err.code === "EPROTO") {
                console.warn(
                    "You using a maybe modern TLS (debian Buster) which is not support by the NINA server. Please adjust in your /etc/ssl/openssl.cnf to CipherString = DEFAULT@SECLEVEL=1"
                );
            } else if (err && err.code === "ETIMEDOUT") {
                console.warn("Cannot reach Server.");
            }
            if (err) {
                node.error("Request error" + JSON.stringify(err));
            }
            node.error(err);
        }

        node.send({
            payload: node.risks
        })
    }

    async function getWarnings(area, config, node) {


        if (!node.state[area]) return;

        for (const bucket of Object.keys(node.state[area].buckets)) {
            for (const ref of node.state[area].buckets[bucket]) {
                if (config.ignoreDwd && bucket === "bbk.dwd") {
                    node.state[area].numberOfWarn = parseInt(node.state[area].numberOfWarn) - 1;

                    return;
                }
                if (config.ignoreLhp && bucket === "bbk.lhp") {
                    node.state[area].numberOfWarn = parseInt(node.state[area].numberOfWarn) - 1;

                    return;
                }

                const headers = {};
                const url = "https://warnung.bund.de/" + bucket + "/" + ref + ".ohne.json";
                if (node.etags[area + url]) {
                    headers["if-none-match"] = node.etags[area + url];
                    headers["if-modified-since"] = node.lastMods[area + url];
                }

                const resp = await got.get(url, {
                    headers: headers
                });

                const body = resp.body;

                if ((resp && resp.statusCode >= 400) || body.indexOf("The service is temporarily unavailable.") !== -1 || body.indexOf("404 Not found") !== -1 || body.indexOf("403 Forbidden") !== -1) {
                    node.warn("cannot reach " + url + " Server.");

                    return;
                }

                const obj = node.risks[area].find((x) => x.identifier === ref);
                const index = node.risks[area].indexOf(obj);
                if (resp) {
                    debug(resp);
                    if (resp.statusCode === 304) {
                        node.etags[area + url] = resp.headers.etag;
                        node.lastMods[area + url] = resp.headers["last-modified"];
                        node.status({ fill: "yellow", shape: "ring", text: "No values updated" })
                        node.risks[area] = node.risksold[area];
                        return;
                    }
                    if (node.etags[area + url] === resp.headers.etag) {
                        debug("Same etag No values updated");

                        return;
                    } else {
                        node.etags[area + url] = resp.headers.etag;
                        node.lastMods[area + url] = resp.headers["last-modified"];
                        debug("Changed: " + url);
                        if (index !== -1) {
                            resetWarnings(area, index, node);
                        }
                    }
                }

                debug(body);
                if (config.filterText) {
                    const filterArray = config.filterText.replace(/ /g, "").split(",");
                    let found = false;
                    filterArray.forEach((element) => {
                        if (body.indexOf(element) !== -1) {
                            found = true;
                        }
                    });
                    if (!found) {
                        node.state[area].numberOfWarn = parseInt(node.state[area].numberOfWarn) - 1;

                        return;
                    }
                }

                const gefahr = JSON.parse(body);
                if (index === -1) {
                    node.risks[area].push(gefahr);
                } else {
                    node.risks[area].splice(index, 1, gefahr);
                }
            }
        }

    }

    async function checkStatus(ags, node) {

        let agsNumber = ags.split("");
        const agsLength = agsNumber.length;
        agsNumber.length = 12;
        agsNumber.fill(0, agsLength, 12);
        agsNumber = agsNumber.join("");

        const url = `https://warnung.bund.de/bbk.status/status_${agsNumber}.json`;
        const headers = {};
        if (node.etags && node.etags[url]) {
            headers["if-none-match"] = node.etags[url];
            headers["if-modified-since"] = node.lastMods[url];
        }

        const resp = await got.get(url, {
            headers: headers
        });
        let body = resp.body;
        if (resp && resp.statusCode >= 400) {
            console.warn("Cannot reach " + url + " Server. Statuscode: " + resp.statusCode);
        }
        if (resp) {
            node.etags[url] = resp.headers.etag;
            node.lastMods[url] = resp.headers["last-modified"];
            debug(resp);
            if (resp.statusCode === 304) {
                node.status({ fill: "yellow", shape: "ring", text: "No Status values updated" })

                return;
            }
        }

        node.state[ags] = {};
        node.state[ags].numberOfWarn = 0;
        node.state[ags].activeWarn = 0;
        node.state[ags].cancelWarn = 0;
        node.state[ags].identifierList = [];
        node.state[ags].buckets = {};
        const status = JSON.parse(body);
        status.forEach((bucket) => {
            node.state[ags].numberOfWarn += bucket.cancelCount;
            node.state[ags].numberOfWarn += bucket.activeCount;
            node.state[ags].cancelWarn += bucket.cancelCount;
            node.state[ags].activeWarn += bucket.activeCount;
            node.state[ags].identifierList = node.state[ags].identifierList.concat(bucket.ref);
            node.state[ags].buckets[bucket.bucketname] = bucket.ref;
        });
    }

    function resetWarnings(areaCode, index, node) {
        if (areaCode && index === undefined) {
            node.risks[areaCode] = [];
            Object.keys(node.etags).forEach((id) => {
                if (id.startsWith(areaCode)) {
                    delete node.etags[id];
                    delete node.lastMods[id];
                }
            });
        }
    }

    RED.nodes.registerType("nina-warnings", warningsNode);
}
