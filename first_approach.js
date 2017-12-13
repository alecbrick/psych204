// Adapted from DIPPL (dippl.org).

var makeObj = function(name, gender) {
  return {name: name, gender: gender, blond: flip(0.5), nice: flip(0.5), tall: flip(0.5)}
}

var worldPrior = function(nObjLeft, meaningFn, worldSoFar, prevFactor) {
  var worldSoFar = worldSoFar==undefined ? [] : worldSoFar
  var prevFactor = prevFactor==undefined ? 0 : prevFactor
  if (nObjLeft==0) {
    factor(-prevFactor)
    return worldSoFar
  } else {
    var name = flip(0.33) ? "Bob" : (flip(0.5) ? "Bill" : "Alice")
    var newObj = makeObj(name, name == "Alice" ? "F" : "M")
    var newWorld = worldSoFar.concat([newObj])
    var newFactor = meaningFn(newWorld) ? 0 : -100
    factor(newFactor - prevFactor)
    return worldPrior(nObjLeft-1, meaningFn, newWorld, newFactor)
  }
}


var meaning = function(utterance) {
  return combineMeanings(filter(function(m){return !(m.sem==undefined)},
                                 map(lexicalMeaning, utterance.split(" "))))
}

var referent = '';

var lexicalMeaning = function(word) {

  var wordMeanings = {

    "blond" : {
      sem: function(world) {
        return function(obj) {
          if (obj instanceof Array) {
            return find(function(o){return o.blond}, obj)
          }
          return obj.blond
        }
      },
      syn: {dir:'L', int:'NP', out:'S'} 
    },
    "nice" : {
      sem: function(world) {
        return function(obj){return obj.nice}
      },
      syn: {dir:'L', int:'NP', out:'S'} 
    },
    "tall" : {
      sem: function(world) {
        return function(obj) {
          if (obj instanceof Array) {
            return find(function(o){return o.tall}, obj)
          }
          return obj.tall
        }
      },
      syn: {dir:'L', int:'NP', out:'S'} 
    },
    "hurt": {
      sem: function(world) {
        return function(obj) {
          return obj.bitten ? flip(0.9) : flip(0.01);
        }
      },
      syn: {dir: 'L', int: 'NP', out: 'S'}
    },
    "Bob" : {
      sem: function(world) {
        var ref = find(function(obj) {return obj.name=="Bob"}, world);
        globalStore.normalReferent = ref;
        return ref;
      },
      syn: 'NP' 
    },
    "Bill" : {
      sem: function(world) {
        var ref = find(function(obj) {return obj.name=="Bill"}, world);
        globalStore.normalReferent = ref;
        return ref;
      },
      syn: 'NP' 
    },
    "Alice" : {
      sem: function(world) {
        var ref = find(function(obj) {return obj.name=="Alice"}, world);
        globalStore.normalReferent = ref;
        return ref;
      },
      syn: 'NP' 
    },
    "Fido" : {
      sem: function(world) {
        var ref = find(function(obj) {return obj.name=="Fido"}, world);
        globalStore.normalReferent = ref;
        return ref;
      },
      syn: 'NP' 
    },
    "he" : {
      sem: function(world) {
        var male = filter(function(obj) {return obj.gender == "M"}, world);
        var i = randomInteger(male.length);
        globalStore.pronounReferent = male[i];
        return male[i];
      }, 
      syn: 'NP' 
    },
    "she" : {
      sem: function(world) {
        var female = filter(function(obj) {return obj.gender == "F"}, world);
        var i = randomInteger(female.length);
        globalStore.pronounReferent = female[i];
        return female[i];
      }, 
      syn: 'NP' 
    },
    "not" : {
      sem: function(world) {
        return function(P) {
          return neg(P);
        }
      },
      syn: {dir: 'R',
            int:{dir: 'L', int:'NP', out:'S'},
            out:{dir: 'L', int:'NP', out:'S'}}
    },
    "some" : {
      sem: function(world) {
        return function(P) {
          return function(Q) {
            return filter(Q, filter(P, world)).length > 0
          }
        }
      },
      syn: {dir:'R',
            int:{dir:'L', int:'NP', out:'S'},
            out:{dir:'R',
                 int:{dir:'L', int:'NP', out:'S'},
                 out:'S'}} 
    },

    "all" : {
      sem: function(world) {
        return function(P) {
          return function(Q) {
            return filter(neg(Q), filter(P, world)).length==0
          }
        }
      },
      syn: {dir:'R',
            int:{dir:'L', int:'NP', out:'S'},
            out:{dir:'R',
                 int:{dir:'L', int:'NP', out:'S'},
                 out:'S'}} 
    },

    "none" : {
      sem: function(world) {
        return function(P) {
          return function(Q) {
            return filter(Q, filter(P, world)).length==0
          }
        }
      },
      syn: {dir:'R',
            int:{dir:'L', int:'NP', out:'S'},
            out:{dir:'R',
                 int:{dir:'L', int:'NP', out:'S'},
                 out:'S'}} 
    }
  }

  var meaning = wordMeanings[word];
  return meaning == undefined ? {sem: undefined, syn: ''} : meaning;
}

var neg = function(Q){
  return function(x) {
    return !Q(x)
  }
}


//assume that both f and a will give their actual semantic value after being applied to a world. make a new meaning that passes on world arg.
var applyWorldPassing = function(f,a) {
  return function(w){
    return f(w)(a(w))
  }
}

var combineMeaning = function(meanings) {
  var possibleComb = canApply(meanings,0)
  var i = possibleComb[randomInteger(possibleComb.length)]
  var s = meanings[i].syn
  if (s.dir == 'L') {
    var f = meanings[i].sem
    var a = meanings[i-1].sem
    var newmeaning = {sem: applyWorldPassing(f,a), syn: s.out}
    return meanings.slice(0,i-1).concat([newmeaning]).concat(meanings.slice(i+1))
  }
  if (s.dir == 'R') {
    var f = meanings[i].sem
    var a = meanings[i+1].sem
    var newmeaning = {sem: applyWorldPassing(f,a), syn: s.out}
    return meanings.slice(0,i).concat([newmeaning]).concat(meanings.slice(i+2))
  }
}

//make a list of the indexes that can (syntactically) apply.
var canApply = function(meanings, i) {
  if (i == meanings.length) {
    return []
  }
  var s = meanings[i].syn
  if (s.hasOwnProperty('dir')) { //a functor
    var a = ((s.dir == 'L') ? syntaxMatch(s.int, meanings[i-1].syn) : false) |
        ((s.dir == 'R') ? syntaxMatch(s.int, meanings[i+1].syn) : false)
    if (a) {
      return [i].concat(canApply(meanings, i+1))
    }
  }
  return canApply(meanings, i+1)
}


// The syntaxMatch function is a simple recursion to
// check if two syntactic types are equal.
var syntaxMatch = function(s,t) {
  return !s.hasOwnProperty('dir') ? s == t :
  s.dir==t.dir & syntaxMatch(s.int,t.int) & syntaxMatch(s.out,t.out)
}


// Recursively do the above until only one meaning is
// left, return its semantics.
var combineMeanings = function(meanings){
  return meanings.length==1 ? meanings[0].sem : combineMeanings(combineMeaning(meanings))
}


var utterancePrior = function() {
  var utterances = ["some of the blond people are nice",
                    "all of the blond people are nice",
                    "none of the blond people are nice"]
  var i = randomInteger(utterances.length)
  return utterances[i]
}


var isall = function(world) {
  return world.length == 0 ? true : (world[0].blond ? world[0].nice : true) && isall(world.slice(1))
}

var worldSize = 3

var literalListener = cache(function(utterance) {
  Infer({ 
    model: function() {
      var m = meaning(utterance)
      var world = worldPrior(worldSize, m)
      factor(m(world) ? 0 : -Infinity)
      return world
    }
  })
})

var speaker = cache(function(world) {
  Infer({ 
    model: function() {
      var utterance = utterancePrior()
      var L = literalListener(utterance)
      factor(L.score(world))
      return utterance
    }
  })
})

var listener = function(utterance) {
  Infer({ 
    model() {
      var world = worldPrior(worldSize, function(w){return 1}) //use vacuous meaning to avoid any guide...
      // var world = worldPrior(worldSize, meaning(utterance)) //guide by literal meaning
      var S = speaker(world)
      factor(S.score(utterance))
      // return isall(world)
      return filter(function(x) {x.blond && x.nice}, world).length / filter(function(x) {x.blond}, world).length
    }
  })
}

// Get a random referent from the world
var referentPrior = function(world, meaningFn) {
  var i = randomInteger(world.length)
  factor(meaningFn(world[i]) ? 0 : -100)
  return world[i]
}

var dogUtterances = [
  "he got hurt",
  "Bob got hurt",
  "Fido got hurt",
  "Bill got hurt",
  "he is not hurt"
]

var normalUtterances = [
  "he is nice",
  "she is nice",
  "he is not nice",
  "Alice is nice",
  "Bill is nice",
  "Bob is nice"
]

var pronounPrior = function(utterances) {
  var i = randomInteger(utterances.length)
  return utterances[i]
}

var literalPronounListener = cache(function(utterance, commonWorld) {
  Infer({
    model: function() {
      var m = meaning(utterance)
      // var referent = referentPrior(world, m)
      var result = m(commonWorld);
      factor(result ? 0 : -Infinity)
      if (globalStore.pronounReferent) {
        return globalStore.pronounReferent;
      }
      return globalStore.normalReferent;
    }
  })
})


var pronounSpeaker = cache(function(referent, commonWorld) {
  Infer({
    model: function() {
      // Choose a random sentence
      var utterance = pronounPrior(dogUtterances)
      // A literal listener hears this sentence
      var L = literalPronounListener(utterance, commonWorld)
      // Prioritize interpretations with this referent
      factor(L.score(referent))
      return utterance
    }
  })
})

// Given an utterance with a pronoun and a world, who is the pronoun
// referring to?
var pronounListener = function(utterance, commonWorld) {
  Infer({
    model: function() {
      var pReferent = referentPrior(commonWorld, function(w) {return 1})
      var S = pronounSpeaker(pReferent, commonWorld) // speaker in this world
      factor(S.score(utterance)) // probability that speaker said our thing
      return pReferent
    }
  })
}

// literalListener("some of the blond people are nice")
// speaker([{name: "Bob", gender: "M", blond: true, nice: true, tall: false}, {name: "Bill", gender: "M", blond: true, nice: false, tall: true}, {name: "Alice", gender: "F", blond: true, nice: false, tall: true}])

// listener("some of the blond people are nice");
var cWorld = [
  {
    name: "Bob",
    gender: "M",
    nice: true
  },
  {
    name: "Bill",
    gender: "M",
    nice: false
  },
  {
    name: "Alice",
    gender: "F",
    nice: true
  }
];

/*
 * O hai, doggy.
 */
var dWorld = [
  {
    name: "Fido",
    species: "dog",
    gender: "M",
    bitten: false
  },
  {
    name: "Bill",
    species: "human",
    gender: "M",
    bitten: false
  },
  {
    name: "Bob",
    species: "human",
    gender: "M",
    bitten: true
  }
];
literalPronounListener("he got hurt", dWorld);
// pronounSpeaker(cWorld[1], cWorld);
// pronounListener("he is nice", cWorld);
// pronounListener("he is not hurt", dWorld)
//pronounSpeaker(dWorld[0], dWorld);
