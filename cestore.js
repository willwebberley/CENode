var cestore = {
    concepts : [

    ],
    instances : [

    ],
    cards : [],
    common_words : ["a"],
    next_id : 0,

    get_concept_by_name : function(name){
        if(name == null){return null;}
        for(var i = 0; i < cestore.concepts.length; i++){
            if(cestore.concepts[i].name() == name.toLowerCase()){
                return cestore.concepts[i];
            }
        }
        return null;
    },

    add_concept : function(name, parent_name){
        if(cestore.concepts.indexOf(name) == -1){
            cestore.next_id++;
            var parent = cestore.get_concept_by_name(parent_name);
            if(parent_name != null && parent == null){
                cestore.concepts.push({name: parent_name, id: cestore.next_id});
                cestore.next_id++;
                cestore.concepts.push({name: name, id: cestore.next_id, parent_id: cestore.next_id-1});
            }
            else if(parent_name != null && parent != null){
                cestore.concepts.push({name: name, id: cestore.next_id, parent_id: parent.id});
            }
            else if(parent_name == null){
                cestore.concepts.push({name: name, id: cestore.next_id, parent_id: null});
            }
        }
    },

    add_instance : function(concept, name){
        if(cestore.concepts.indexOf(concept) > -1){
            cestore.instances.push({});
        }
    },

    parse_ce : function(t){
        t = t.toLowerCase();
        t = t.replace(/~/g, '');
        t = t.replace(/\ba\b/g, ''); 
        var facts = t.split(/\band\b/);
        var tokens = t.split(/[ ]+/);
        console.log(tokens); 
        if(t.indexOf("conceptualise") == 0){
            var name = tokens[1];
            var parent = null;
            for(var i = 0; i < tokens.length-1; i++){
                if(tokens[i] == "that" && tokens[i+1] == "is"){
                    parent = tokens[i+2].trim();
                }
            }
            cestore.add_concept(name, parent);
        }
    }
};
