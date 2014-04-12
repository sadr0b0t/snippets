
var data = [
    		{
		   	thumb: 'http://umassamherstm5.org/wp-content/plugins/dm-albums/php/image.php?degrees=0&scale=yes&maintain_aspect=yes&quality=95&rounding=nearest&image=/home/m5root/webapps/wordpress//wp-content/uploads/dm-albums/PIC32 3/pic32_tut3_interrupts_board1.png&width=60&height=40',
	        image: 'http://umassamherstm5.org/wp-content/plugins/dm-albums/php/image.php?degrees=0&scale=yes&maintain_aspect=yes&quality=95&rounding=nearest&image=/home/m5root/webapps/wordpress//wp-content/uploads/dm-albums/PIC32 3/pic32_tut3_interrupts_board1.png&width=500&height=500',
	        big: 'http://umassamherstm5.org/wp-content/uploads/dm-albums/PIC32 3/pic32_tut3_interrupts_board1.png',
	        description: ''	        	    },
    		{
		   	thumb: 'http://umassamherstm5.org/wp-content/plugins/dm-albums/php/image.php?degrees=0&scale=yes&maintain_aspect=yes&quality=95&rounding=nearest&image=/home/m5root/webapps/wordpress//wp-content/uploads/dm-albums/PIC32 3/PIC32_tut3.jpg&width=60&height=40',
	        image: 'http://umassamherstm5.org/wp-content/plugins/dm-albums/php/image.php?degrees=0&scale=yes&maintain_aspect=yes&quality=95&rounding=nearest&image=/home/m5root/webapps/wordpress//wp-content/uploads/dm-albums/PIC32 3/PIC32_tut3.jpg&width=500&height=500',
	        big: 'http://umassamherstm5.org/wp-content/uploads/dm-albums/PIC32 3/PIC32_tut3.jpg',
	        description: ''	        	    }
    ];

$('#galleria-53470098c9a88').galleria({
    dataSource: data,
    transition: "fadeslide",
    transitionSpeed: 300,
    width: document.getElementById("galleria-53470098c9a88").clientWidth,
    height: document.getElementById("galleria-53470098c9a88").clientWidth * 0.75,
        lightbox: true,
        idleTime: 2000,
        queue: false,
        layerFollow: false,
        popupLinks: false,
        fullscreenCrop: false,
                        dummy: 'http://umassamherstm5.org/wp-content/plugins/dm-albums/galleria/themes/classic/dummy.png',
        extend:function() {
            this.attachKeyboard({
                left: this.prev,
                right: this.next
            });
        },
        debug: false
    });

