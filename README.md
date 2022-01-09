# Node RED NINA

Node-RED node for querying NINA (Notfall-Informations- und Nachrichten- App des Bundes)

## :question: Get Help

For bug reports and feature requests, open issues. :bug:


## :sparkling_heart: Support my projects

I open-source almost everything I can, and I try to reply to everyone needing help using these projects. Obviously,
this takes time. You can integrate and use these projects in your applications _for free_! You can even change the source code and redistribute (even resell it).

Thank you to all my backers!
### People

- [fflorent](https://github.com/fflorent)
- [Speeedy0815](https://github.com/Speeedy0815)
- Ralf S.
- Enno L.
- Jürgen G.
- Mark MC G.
- Kay-Uwe M.
- Craig O.
- Manuel G.

### Become a backer


However, if you get some profit from this or just want to encourage me to continue creating stuff, there are few ways you can do it:

- Starring and sharing the projects you like :rocket:
- **Crypto.&#65279;com** &nbsp;—&nbsp; Use my referral link https://crypto.com/app/f2smbah8fm to sign up for Crypto.&#65279;com and we both get $25 USD :)  

- [![PayPal](https://img.shields.io/badge/Donate-PayPal-blue.svg?style=for-the-badge)][paypal-donations] &nbsp; — &nbsp; You can make one-time donations via PayPal. I'll probably buy a ~~coffee~~ tea. :tea:
- [![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/T6T412CXA) &nbsp;—&nbsp; I'll buy a ~~tea~~ coffee. :coffee: :wink:

Thanks! :heart:
## :cloud: Installation

First of all install [Node-RED](http://nodered.org/docs/getting-started/installation)

```sh
$ sudo npm install -g node-red
# Then open  the user data directory  `~/.node-red`  and install the package
$ cd ~/.node-red
$ npm install node-red-contrib-nina
```

Or search for nina in the manage palette menu

Then run

```
node-red
```

## :yum: How to contribute

Have an idea? Found a bug? See [how to contribute][contributing].

```sh
git clone https://github.com/naimo84/node-red-contrib-nina.git
cd node-red-contrib-nina
npm install
gulp
cd ~/.node-red
npm install /path/to/node-red-contrib-nina
```

# :scroll: Credits

-   The whole module is inspired by ioBroker's adapter https://github.com/TA2k/ioBroker.nina. Many many thanks folks ;)


[paypal-donations]: https://paypal.me/NeumannBenjamin
[contributing]: /CONTRIBUTING.md
