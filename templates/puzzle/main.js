import Game from './Game.js';
import MainMenu from './mainmenu.js';
import Preloader from './preloader.js';

const config = {
    type: Phaser.AUTO,
    width: 1024,
    height: 768,
    backgroundColor: '#002157',
    scene: [ Preloader, MainMenu, Game ],
    
};

let game = new Phaser.Game(config);