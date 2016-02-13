var my_name = 'User';
var PLANETS_MODEL = [
  "there is a rule named 'r1' that has 'if the planet C ~ orbits ~ the star D then the star D ~ is orbited by ~ the planet C' as instruction.",
  "there is a rule named 'r2' that has 'if the planet C ~ is orbited by ~ the moon D then the moon D ~ orbits ~ the planet C' as instruction.",
  "conceptualise a ~ celestial body ~ C.",
  "conceptualise the celestial body C ~ orbits ~ the celestial body D and ~ is orbited by ~ the celestial body E.",
  "conceptualise a ~ planet ~ P that is a celestial body and is an imageable thing.",
  "conceptualise a ~ moon ~ M that is a celestial body.",
  "conceptualise a ~ star ~ S that is a celestial body.",
  "there is a star named sun.",
  "there is a planet named Mercury that orbits the star 'sun' and has 'media/Mercury.jpg' as image.",
  "there is a planet named Venus that orbits the star 'sun' and has 'media/Venus.jpg' as image.",
  "there is a planet named Earth that orbits the star 'sun' and is orbited by the moon 'the Moon' and has 'media/Earth.jpg' as image.",
  "there is a planet named Mars that orbits the star 'sun' and is orbited by the moon 'Phobos' and is orbited by the moon 'Deimos' and has 'media/Mars.jpg' as image.",
  "there is a planet named Jupiter that orbits the star 'sun' and is orbited by the moon 'Io' and is orbited by the moon 'Europa' and is orbited by the moon 'Ganymede' and is orbited by the moon 'Callisto' and has 'media/Jupiter.jpg' as image.",
  "there is a planet named Saturn that orbits the star 'sun' and is orbited by the moon 'Mimas' and is orbited by the moon 'Enceladus' and is orbited by the moon 'Tethys' and is orbited by the moon 'Dione' and is orbited by the moon 'Rhea' and is orbited by the moon 'Titan' and is orbited by the moon 'Iapetus' and has 'media/Saturn.jpg' as image.",
  "there is a planet named Uranus that orbits the star 'sun' and is orbited by the moon 'Puck' and is orbited by the moon 'Miranda' and is orbited by the moon 'Ariel' and is orbited by the moon 'Umbriel' and is orbited by the moon 'Titania' and is orbited by the moon 'Oberon' and has 'media/Uranus.jpg' as image.",
  "there is a planet named Neptune that orbits the star 'sun' and is orbited by the moon 'Triton' and is orbited by the moon 'Nereid' and is orbited by the moon 'Larissa' and has 'media/Neptune.jpg' as image.",
];

var processed_cards = [];

var node = new CENode(MODELS.CORE, PLANETS_MODEL);
node.agent.set_name('agent1');

var input = document.getElementById('input');
var button = document.getElementById('send');
var messages = document.getElementById('messages');

button.onclick = send_message;
input.onkeyup = function(e){
    if(e.keyCode == 13){
        send_message();
    }
};

function send_message(){
    var message = input.value.trim(); // CENode seems to need this
    input.value = ''; // blank the input field for new messages
    if (message == '') return; // don't submit empty messages
    var card = "there is a nl card named '{uid}' that is to the agent 'agent1' and is from the individual '"+my_name+"' and has the timestamp '{now}' as timestamp and has '"+message.replace(/'/g, "\\'")+"' as content.";
    node.add_sentence(card);

    // Finally, prepend our message to the list of messages:
    var item = '<li class="'+my_name+'">'+message+'</li>';
    messages.innerHTML = item + messages.innerHTML;
};

function poll_cards(){
    setTimeout(function(){
        var cards = node.concepts.card.all_instances; // Recursively get any cards the agent knows about
        for(var i = 0; i < cards.length; i++){
            var card = cards[i];
            if(card.is_to.name == my_name && processed_cards.indexOf(card.name) == -1){ // If sent to us and is still yet unseen
                processed_cards.push(card.name); // Add this card to the list of 'seen' cards
                var gist = card.content;
                var imgmatch = gist.match(/[\'\"](.*)[\'\"] as image/);
                var item = '<li class="'+card.is_from.name+'">'+gist;
                if(imgmatch != null) {
                  item += "<br><br><img src='" + imgmatch[1] + "' width='200'>";
                }
                item += '</li>';
                messages.innerHTML = item + messages.innerHTML; // Prepend this new message to our list in the DOM
            }
        }
        poll_cards(); // Restart the method again
    }, 1000);
}

poll_cards();
