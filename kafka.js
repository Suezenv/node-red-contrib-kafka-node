/**
 * Created by fwang1 on 3/25/15.
 */
module.exports = function(RED) {
    /*
     *   Kafka Producer
     *   Parameters:
     - topics
     - zkquorum(example: zkquorum = “[host]:2181")
     */
    function kafkaNode(config) {
        RED.nodes.createNode(this,config);
        var topic = config.topic;
        var clusterZookeeper = config.zkquorum;
        var debug = (config.debug == "debug");
        var node = this;
        var kafka = require('kafka-node');
        var HighLevelProducer = kafka.HighLevelProducer;
        var Client = kafka.Client;
        var topics = config.topics;
        var client = new Client(clusterZookeeper);

        try {
            this.on("input", function(msg) {
                var payloads = [];

                // check if multiple topics
                if (topics.indexOf(",") > -1){
                    var topicArry = topics.split(',');

                    for (i = 0; i < topicArry.length; i++) {
                        payloads.push({topic: topicArry[i], messages: msg.payload});
                    }
                }
                else {
                    payloads = [{topic: topics, messages: msg.payload}];
                }

                producer.send(payloads, function(err, data){
                    if (err){
                        node.error(err);
                    }
                    node.log("Message Sent: " + data);
                });
            });
        }
        catch(e) {
            node.error(e);
        }
        var producer = new HighLevelProducer(client);
        this.status({fill:"green",shape:"dot",text:"connected to "+clusterZookeeper});
    }

    RED.nodes.registerType("kafka",kafkaNode);


    /*
     *   Kafka Consumer
     *   Parameters:
     - topics
     - groupId
     - zkquorum(example: zkquorum = “[host]:2181")
     */
    function kafkaInNode(config) {
        RED.nodes.createNode(this,config);

        var node = this;

        var kafka = require('kafka-node');
        var HighLevelConsumer = kafka.HighLevelConsumer;
        var Client = kafka.Client;
        var topics = String(config.topics);
        var clusterZookeeper = config.zkquorum;
        var groupId = config.groupId;
        var debug = (config.debug == "debug");

        var zkOptions = {};
        if(config.sessionTimeout != '')
        {
            try {
                zkOptions.sessionTimeout = parseInt(config.sessionTimeout);
            }
            catch(e){
                node.error(e);
            }
        }

        var client = new Client(clusterZookeeper, null, zkOptions);

        var topicJSONArry = [];

        // check if multiple topics
        if (topics.indexOf(",") > -1){
            var topicArry = topics.split(',');
            if (debug) {
                console.log(topicArry)
                console.log(topicArry.length);
            }

            for (i = 0; i < topicArry.length; i++) {
                if (debug) {
                    console.log(topicArry[i]);
                }
                topicJSONArry.push({topic: topicArry[i]});
            }
            topics = topicJSONArry;
        }
        else {
            topics = [{topic:topics}];
        }

        var options = {
            groupId: groupId,
            autoCommit: config.autoCommit,
            autoCommitMsgCount: 10
        };

        if(config.fetchMaxBytes != '')
        {
            try {
                options.fetchMaxBytes = parseInt(config.fetchMaxBytes);
            }
            catch(e){
                node.error(e);
            }
        }

        var consumerCreationDelay = 0;

        if (config.delayConsumerCreation) {
            consumerCreationDelay = parseInt(config.sessionTimeout) || 60000;
            node.log('Consumer creation delayed by ' + consumerCreationDelay + ' millisecondes');
        }

        var createConsumer = function() {
            try {
                var consumer = new HighLevelConsumer(client, topics, options);
                node.log("Consumer created...");
                node.status({fill:"green",shape:"dot",text:"connected to "+clusterZookeeper});

                consumer.on('message', function (message) {
                    if (debug) {
                        console.log(message);
                        node.log(message);
                    }
                    var msg = {payload: message};
                    node.send(msg);
                });

                consumer.on('error', function (err) {
                console.error(err);
                });
            }
            catch(e){
                node.error(e);
                return;
            }
        };

        setTimeout(createConsumer, consumerCreationDelay);
    }

    RED.nodes.registerType("kafka in", kafkaInNode);
};
