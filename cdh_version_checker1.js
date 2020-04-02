window.cdh_version_checker = window.cdh_version_checker || {
    'use strict';
    initialized: false,

    // Initialize message object with data object for passing information
    message: {
        header: '',
        footer: '<br><p style="">Comments / bugs / feature requests? Send them to <a href="mailto:robin.caboni@tealium.com">robin.caboni@tealium.com</a></p>',
        namespace: "cdh_version_checker_main",
        data: {
            msg_queue: []
        }
    },

    // Incoming tool object from Tealium tools .html (Handlebars) UI
    main: function(tool) {
        if (document.URL.indexOf('my.tealiumiq.com/datacloud/') === -1) {
            this.error('You need to be on CDH');
            return false
        }
        switch (tool.command) {
            case "start":
                this.start();
                break;
            case "run":                
                this.functionOne();
                break;
            case "exit":
                this.exit();
                break;
            default:
                this.error("Unknown command received from Tealium Tool: '"+tool.command+"'");
                break;
        }
        tealiumTools.send(this.message);

    },
    functionOne: function(){
        var self = this;
        alert("yes");
        this.ui_state('ui_finish');
    },
    log: function(str) {
        console.log(str);
        this.message.data.msg_queue.push(str);
        tealiumTools.send(this.message);
    },
    exit: function() {
        this.message.exit = true;
    },
    start: function() {
        this.message.exit = false;
        this.ui_state('ui_start');
        //Clear the attributes array
        this.message.data.attributes = [];     
    },

    makeProgressCircle: function(msg) {
        // console.log("makeProgressCircle");
        this.ui_state('ui_wait');
        if (typeof msg !== 'undefined') {
            this.message.data.wait_message = msg;
        }
        tealiumTools.send(this.message);
    },

    ui_state: function(cmd) {
        var that = this;
        Object.keys(this.message).forEach(function(key, index) {
            if (key.indexOf('ui_') === 0) {
                that.message[key] = false;
            }
        });
        this.message[cmd] = true;
    },

    error: function(msg) {
        this.ui_state('ui_error');
        this.message.data.error_message = msg;
        console.log('Error: '+msg);
        tealiumTools.send(this.message);
    }
}

window.cdh_version_checker_main = function(arg) {
    return cdh_version_checker.main(arg);
}

if (!cdh_version_checker.initialized) {
    cdh_version_checker.initialized = true;
    cdh_version_checker_main({
        command: "start"
    });
} else {
    if (typeof cdh_version_checker.message.ui_finish === 'undefined' || cdh_version_checker.message.exit === true) {
        cdh_version_checker_main({
            command: "start"
        });
    }
} 