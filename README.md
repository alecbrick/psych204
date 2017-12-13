PSYCH 204 project. The goal is to determine who pronouns refer to using the RSA framework.

"first\_approach.js" is my initial implementation, and has no helper files. You can run it with "webppl first\_approach.js".

"world\_edit.js" is the approach that modifies an existing common world, and relies on "meaning.js". You can run that file with "webppl world\_edit.js --require .". Making modifications to the initial setup requires a lot of tweaking of this file, but you should be able to replace the sentence that the listener hears, provided that it's in the utterance list. You can also uncomment the speaker and literal listener (provided that the others are commented out) in order to see how they perform. The speaker takes a world as its input, and I use testWorld for that.
