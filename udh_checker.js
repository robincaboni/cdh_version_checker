/*
UDH Checker
Created by Jason Paddock
Date: 8/17/17
Version: 1.0
Change Log: 
    1.0: Initial Release
*/
window.udh_checker = window.udh_checker || {

    initialized: false,

    // Initialize message object with data object for passing information
    message: {
        header: '',
        footer: '<br><p style="">Comments / bugs / feature requests? Send them to <a href="mailto:jason.paddock@tealium.com">jason.paddock@tealium.com</a></p>',
        namespace: "udh_checker_main",
        data: {
            msg_queue: []
        }
    },

    // Incoming tool object from Tealium tools .html (Handlebars) UI
    main: function(tool) {
        if (document.URL.indexOf('my.tealiumiq.com/datacloud/') === -1) {
            this.error('Need to be on UDH');
            return false
        }
        switch (tool.command) {
            case "start":
                this.start();
                break;
            case "run":                
                this.checkForInvalidAttributes();
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
    checkForInvalidAttributes: function(){
        var self = this;
        //Get invalid attributes
        var invalidAttributes = _.filter(gApp.inMemoryModels.quantifierCollection.models, function (model) {
            return self.isInvalidName(model.get('name'));
        });
        //Loop through invalidAttributes
        for(var i = 0; i < invalidAttributes.length; i++){
            var a = invalidAttributes[i].attributes;
            this.message.data.attributes.push({name:a.name,id:a.utui_id.id});
        }
        this.ui_state('ui_finish');
    },
    isInvalidName: function(name) {
        return name
            .split('')
            .some(function (char) {
                return char.charCodeAt(0) > 127;
            }) || name.length > 250;
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

window.udh_checker_main = function(arg) {
    return udh_checker.main(arg);
}

if (!udh_checker.initialized) {
    udh_checker.initialized = true;
    udh_checker_main({
        command: "start"
    });
} else {
    if (typeof udh_checker.message.ui_finish === 'undefined' || udh_checker.message.exit === true) {
        udh_checker_main({
            command: "start"
        });
    }
} 