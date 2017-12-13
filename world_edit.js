// Adapted from DIPPL (dippl.org).

var makeObj = function(name, gender) {
  return {name: name, gender: gender, blond: flip(0.5), nice: flip(0.5), tall: flip(0.5)}
}

var pragmaticWorldPrior = function(worldSoFar) {
  // Hurt
  var rand = randomInteger(worldSoFar.length);
  var randRef = worldSoFar[rand];
  return map(function(x) {objReplace(x, extend(randRef, {'hurt': false}))}, worldSoFar);
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
  "he did not get hurt",
  "Bob did not get hurt",
  "Fido did not get hurt",
  "Bill did not get hurt"
]

/*
var utterances = ["he is nice",
                  "she is nice",
                  "he is not nice"]
*/
var pronounPrior = function(utterances) {
  var i = randomInteger(utterances.length)
  return utterances[i]
}

var literalPronounListener = cache(function(utterance, commonWorld) {
  Infer({
    model: function() {
      var m = meaning(utterance)
      var result = m(commonWorld);
      return map(function(x) {extend(x, {indeterminate: false})}, result);
    }
  })
})


var pronounSpeaker = cache(function(world, commonWorld) {
  Infer({
    model: function() {
      // Choose a random sentence
      var utterance = pronounPrior(dogUtterances)
      // factor(utterance.includes("he") ? 1 : 0)
      // A literal listener hears this sentence
      var L = literalPronounListener(utterance, commonWorld)
      // Prioritize interpretations with this referent
      factor(L.score(world))
      return utterance
    }
  })
})

// Given an utterance with a pronoun and a world, who is the pronoun
// referring to?
var pronounListener = function(utterance, commonWorld) {
  Infer({
    model: function() {
      // var pReferent = referentPrior(commonWorld, function(w) {return 1})
      // var world = pragmaticWorldPrior(commonWorld)
      var world = map(function(w) {extend(w, {indeterminate: false})}, meaning(utterance)(commonWorld));
      // speaker in this world
      var S = pronounSpeaker(world, commonWorld)
      factor(S.score(utterance)) // probability that speaker said our thing
      return world
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
    lastSeen: 1,
    bitten: false,
    indeterminate: false
  },
  {
    name: "Bill",
    species: "human",
    gender: "M",
    lastSeen: 2,
    bitten: false,
    indeterminate: false
  },
  {
    name: "Bob",
    species: "human",
    gender: "M",
    lastSeen: 1,
    bitten: true,
    indeterminate: false
  }
];

var testWorld = [
  {
    name: "Fido",
    species: "dog",
    gender: "M",
    lastSeen: 1,
    bitten: false,
    indeterminate: false,
  },
  {
    name: "Bill",
    species: "human",
    gender: "M",
    lastSeen: 2,
    bitten: false,
    indeterminate: false,
  },
  {
    name: "Bob",
    species: "human",
    gender: "M",
    lastSeen: 1,
    bitten: true,
    indeterminate: false,
    hurt: false
  }
];

// literalPronounListener("he did not get hurt", dWorld);
// pronounSpeaker(testWorld, dWorld);
pronounListener("he did not get hurt", dWorld)
