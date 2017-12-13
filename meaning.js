// Adapted from DIPPL (dippl.org).

var meaning = function(utterance) {
  return combineMeanings(filter(function(m){return !(m.sem==undefined)},
                                 map(lexicalMeaning, utterance.split(" "))))
}

// Replace the original object with this new object.
var objReplace = function(origObj, newObj) {
  if (origObj.name == newObj.name) {
    return newObj;
  } else {
    return origObj;
  }
}

var lexicalMeaning = function(word) {
  var wordMeanings = {
    "blond" : {
      sem: function(world) {
        return function(obj, val) {
          var newVal = (val == undefined) ? true : val;
          var newObj = extend(obj, {blond: newVal});
          return map(function(x) {objReplace(x, newObj)}, world);
        }
      },
      syn: {dir:'L', int:'NP', out:'S'} 
    },
    "nice" : {
      sem: function(world) {
        return function(obj, val) {
          var newVal = (val == undefined) ? true : val;
          var newObj = extend(obj, {nice: newVal});
          return map(function(x) {objReplace(x, newObj)}, world);
        }
      },
      syn: {dir:'L', int:'NP', out:'S'} 
    },
    "tall" : {
      sem: function(world) {
        return function(obj) {
          var newVal = (val == undefined) ? true : val;
          var newObj = extend(obj, {tall: newVal});
          return map(function(x) {objReplace(x, newObj)}, world);
        }
      },
      syn: {dir:'L', int:'NP', out:'S'} 
    },
    "hurt": {
      sem: function(world) {
        return function(obj, val) {
          // For probabilistic properties:
          // If someone says "Bob got hurt", then Bob definitely got hurt.
          // If someone says "He got hurt", we need to reason about
          // applicability of the predicate.
          factor(obj.bitten ? 5 : 0)
          var defaultVal = val == undefined ? true : val
          var flipVal = obj.bitten ? flip(0.9) : flip(0.01);
          condition(obj.indeterminate ? flipVal == defaultVal : true)
          var newVal = obj.indeterminate ? flipVal : defaultVal;
          var newObj = extend(obj, {hurt: newVal});
          return map(function(x) {objReplace(x, newObj)}, world);
        }
      },
      syn: {dir: 'L', int: 'NP', out: 'S'}
    },
    "Bob" : {
      sem: function(world) {
        var ref = find(function(obj) {return obj.name=="Bob"}, world);
        globalStore.normalReferent = ref;
        return extend(ref, {indeterminate: false});
      },
      syn: 'NP' 
    },
    "Bill" : {
      sem: function(world) {
        var ref = find(function(obj) {return obj.name=="Bill"}, world);
        globalStore.normalReferent = ref;
        return extend(ref, {indeterminate: false});
      },
      syn: 'NP' 
    },
    "Fido" : {
      sem: function(world) {
        var ref = find(function(obj) {return obj.name=="Fido"}, world);
        globalStore.normalReferent = ref;
        return extend(ref, {indeterminate: false});
      },
      syn: 'NP' 
    },
    "he" : {
      sem: function(world) {
        var male = filter(function(obj) {return obj.gender == "M"}, world);
        var i = randomInteger(male.length);
        factor(-1 * male[i].lastSeen)
        globalStore.pronounReferent = male[i];
        return extend(male[i], {indeterminate: true});
      }, 
      syn: 'NP' 
    },
    "she" : {
      sem: function(world) {
        var female = filter(function(obj) {return obj.gender == "F"}, world);
        var i = randomInteger(female.length);
        factor(-1 * female[i].lastSeen)
        globalStore.pronounReferent = female[i];
        return extend(female[i], {indeterminate: true});
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

var neg = function(Q) {
  return function(x) {
    return Q(x, false);
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

