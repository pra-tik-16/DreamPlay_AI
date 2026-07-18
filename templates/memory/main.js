import { Preloader } from './PreLoader.js';
import { Play } from './play.js';

const config = {
    title: 'Card Memory Game',
    type: Phaser.AUTO,
    backgroundColor: "#192a56",
    width: 549,
    height: 480,
    parent: "phaser-example",
    render: {
        pixelArt: true,
    },
    scene: [
        Preloader,
        Play
    ]
};

new Phaser.Game(config);