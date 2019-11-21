"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var FudgeCore;
(function (FudgeCore) {
    /**
     * Handles the external serialization and deserialization of [[Serializable]] objects. The internal process is handled by the objects themselves.
     * A [[Serialization]] object can be created from a [[Serializable]] object and a JSON-String may be created from that.
     * Vice versa, a JSON-String can be parsed to a [[Serialization]] which can be deserialized to a [[Serializable]] object.
     * ```plaintext
     *  [Serializable] → (serialize) → [Serialization] → (stringify)
     *                                                        ↓
     *                                                    [String]
     *                                                        ↓
     *  [Serializable] ← (deserialize) ← [Serialization] ← (parse)
     * ```
     * While the internal serialize/deserialize methods of the objects care of the selection of information needed to recreate the object and its structure,
     * the [[Serializer]] keeps track of the namespaces and classes in order to recreate [[Serializable]] objects. The general structure of a [[Serialization]] is as follows
     * ```plaintext
     * {
     *      namespaceName.className: {
     *          propertyName: propertyValue,
     *          ...,
     *          propertyNameOfReference: SerializationOfTheReferencedObject,
     *          ...,
     *          constructorNameOfSuperclass: SerializationOfSuperClass
     *      }
     * }
     * ```
     * Since the instance of the superclass is created automatically when an object is created,
     * the SerializationOfSuperClass omits the the namespaceName.className key and consists only of its value.
     * The constructorNameOfSuperclass is given instead as a property name in the serialization of the subclass.
     */
    class Serializer {
        /**
         * Registers a namespace to the [[Serializer]], to enable automatic instantiation of classes defined within
         * @param _namespace
         */
        static registerNamespace(_namespace) {
            for (let name in Serializer.namespaces)
                if (Serializer.namespaces[name] == _namespace)
                    return;
            let name = Serializer.findNamespaceIn(_namespace, window);
            if (!name)
                for (let parentName in Serializer.namespaces) {
                    name = Serializer.findNamespaceIn(_namespace, Serializer.namespaces[parentName]);
                    if (name) {
                        name = parentName + "." + name;
                        break;
                    }
                }
            if (!name)
                throw new Error("Namespace not found. Maybe parent namespace hasn't been registered before?");
            Serializer.namespaces[name] = _namespace;
        }
        /**
         * Returns a javascript object representing the serializable FUDGE-object given,
         * including attached components, children, superclass-objects all information needed for reconstruction
         * @param _object An object to serialize, implementing the [[Serializable]] interface
         */
        static serialize(_object) {
            let serialization = {};
            // TODO: save the namespace with the constructors name
            // serialization[_object.constructor.name] = _object.serialize();
            let path = this.getFullPath(_object);
            if (!path)
                throw new Error(`Namespace of serializable object of type ${_object.constructor.name} not found. Maybe the namespace hasn't been registered or the class not exported?`);
            serialization[path] = _object.serialize();
            return serialization;
            // return _object.serialize();
        }
        /**
         * Returns a FUDGE-object reconstructed from the information in the [[Serialization]] given,
         * including attached components, children, superclass-objects
         * @param _serialization
         */
        static deserialize(_serialization) {
            let reconstruct;
            try {
                // loop constructed solely to access type-property. Only one expected!
                for (let path in _serialization) {
                    // reconstruct = new (<General>Fudge)[typeName];
                    reconstruct = Serializer.reconstruct(path);
                    reconstruct.deserialize(_serialization[path]);
                    return reconstruct;
                }
            }
            catch (message) {
                throw new Error("Deserialization failed: " + message);
            }
            return null;
        }
        //TODO: implement prettifier to make JSON-Stringification of serializations more readable, e.g. placing x, y and z in one line
        static prettify(_json) { return _json; }
        /**
         * Returns a formatted, human readable JSON-String, representing the given [[Serializaion]] that may have been created by [[Serializer]].serialize
         * @param _serialization
         */
        static stringify(_serialization) {
            // adjustments to serialization can be made here before stringification, if desired
            let json = JSON.stringify(_serialization, null, 2);
            let pretty = Serializer.prettify(json);
            return pretty;
        }
        /**
         * Returns a [[Serialization]] created from the given JSON-String. Result may be passed to [[Serializer]].deserialize
         * @param _json
         */
        static parse(_json) {
            return JSON.parse(_json);
        }
        /**
         * Creates an object of the class defined with the full path including the namespaceName(s) and the className seperated by dots(.)
         * @param _path
         */
        static reconstruct(_path) {
            let typeName = _path.substr(_path.lastIndexOf(".") + 1);
            let namespace = Serializer.getNamespace(_path);
            if (!namespace)
                throw new Error(`Namespace of serializable object of type ${typeName} not found. Maybe the namespace hasn't been registered?`);
            let reconstruction = new namespace[typeName];
            return reconstruction;
        }
        /**
         * Returns the full path to the class of the object, if found in the registered namespaces
         * @param _object
         */
        static getFullPath(_object) {
            let typeName = _object.constructor.name;
            // Debug.log("Searching namespace of: " + typeName);
            for (let namespaceName in Serializer.namespaces) {
                let found = Serializer.namespaces[namespaceName][typeName];
                if (found && _object instanceof found)
                    return namespaceName + "." + typeName;
            }
            return null;
        }
        /**
         * Returns the namespace-object defined within the full path, if registered
         * @param _path
         */
        static getNamespace(_path) {
            let namespaceName = _path.substr(0, _path.lastIndexOf("."));
            return Serializer.namespaces[namespaceName];
        }
        /**
         * Finds the namespace-object in properties of the parent-object (e.g. window), if present
         * @param _namespace
         * @param _parent
         */
        static findNamespaceIn(_namespace, _parent) {
            for (let prop in _parent)
                if (_parent[prop] == _namespace)
                    return prop;
            return null;
        }
    }
    /** In order for the Serializer to create class instances, it needs access to the appropriate namespaces */
    Serializer.namespaces = { "ƒ": FudgeCore };
    FudgeCore.Serializer = Serializer;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Base class for all types being mutable using [[Mutator]]-objects, thus providing and using interfaces created at runtime.
     * Mutables provide a [[Mutator]] that is build by collecting all object-properties that are either of a primitive type or again Mutable.
     * Subclasses can either reduce the standard [[Mutator]] built by this base class by deleting properties or implement an individual getMutator-method.
     * The provided properties of the [[Mutator]] must match public properties or getters/setters of the object.
     * Otherwise, they will be ignored if not handled by an override of the mutate-method in the subclass and throw errors in an automatically generated user-interface for the object.
     */
    class Mutable extends EventTarget {
        /**
         * Retrieves the type of this mutable subclass as the name of the runtime class
         * @returns The type of the mutable
         */
        get type() {
            return this.constructor.name;
        }
        /**
         * Collect applicable attributes of the instance and copies of their values in a Mutator-object
         */
        getMutator() {
            let mutator = {};
            // collect primitive and mutable attributes
            for (let attribute in this) {
                let value = this[attribute];
                if (value instanceof Function)
                    continue;
                if (value instanceof Object && !(value instanceof Mutable))
                    continue;
                mutator[attribute] = this[attribute];
            }
            // mutator can be reduced but not extended!
            Object.preventExtensions(mutator);
            // delete unwanted attributes
            this.reduceMutator(mutator);
            // replace references to mutable objects with references to copies
            for (let attribute in mutator) {
                let value = mutator[attribute];
                if (value instanceof Mutable)
                    mutator[attribute] = value.getMutator();
            }
            return mutator;
        }
        /**
         * Collect the attributes of the instance and their values applicable for animation.
         * Basic functionality is identical to [[getMutator]], returned mutator should then be reduced by the subclassed instance
         */
        getMutatorForAnimation() {
            return this.getMutator();
        }
        /**
         * Collect the attributes of the instance and their values applicable for the user interface.
         * Basic functionality is identical to [[getMutator]], returned mutator should then be reduced by the subclassed instance
         */
        getMutatorForUserInterface() {
            return this.getMutator();
        }
        /**
         * Returns an associative array with the same attributes as the given mutator, but with the corresponding types as string-values
         * Does not recurse into objects!
         * @param _mutator
         */
        getMutatorAttributeTypes(_mutator) {
            let types = {};
            for (let attribute in _mutator) {
                let type = null;
                let value = _mutator[attribute];
                if (_mutator[attribute] != undefined)
                    if (typeof (value) == "object")
                        type = this[attribute].constructor.name;
                    else
                        type = _mutator[attribute].constructor.name;
                types[attribute] = type;
            }
            return types;
        }
        /**
         * Updates the values of the given mutator according to the current state of the instance
         * @param _mutator
         */
        updateMutator(_mutator) {
            for (let attribute in _mutator) {
                let value = _mutator[attribute];
                if (value instanceof Mutable)
                    value = value.getMutator();
                else
                    _mutator[attribute] = this[attribute];
            }
        }
        /**
         * Updates the attribute values of the instance according to the state of the mutator. Must be protected...!
         * @param _mutator
         */
        mutate(_mutator) {
            // TODO: don't assign unknown properties
            for (let attribute in _mutator) {
                let value = _mutator[attribute];
                let mutant = this[attribute];
                if (mutant instanceof Mutable)
                    mutant.mutate(value);
                else
                    this[attribute] = value;
            }
            this.dispatchEvent(new Event("mutate" /* MUTATE */));
        }
    }
    FudgeCore.Mutable = Mutable;
})(FudgeCore || (FudgeCore = {}));
/// <reference path="../Transfer/Serializer.ts"/>
/// <reference path="../Transfer/Mutable.ts"/>
var FudgeCore;
/// <reference path="../Transfer/Serializer.ts"/>
/// <reference path="../Transfer/Mutable.ts"/>
(function (FudgeCore) {
    /**
     * Internally used to differentiate between the various generated structures and events.
     * @author Lukas Scheuerle, HFU, 2019
     */
    let ANIMATION_STRUCTURE_TYPE;
    (function (ANIMATION_STRUCTURE_TYPE) {
        /**Default: forward, continous */
        ANIMATION_STRUCTURE_TYPE[ANIMATION_STRUCTURE_TYPE["NORMAL"] = 0] = "NORMAL";
        /**backward, continous */
        ANIMATION_STRUCTURE_TYPE[ANIMATION_STRUCTURE_TYPE["REVERSE"] = 1] = "REVERSE";
        /**forward, rastered */
        ANIMATION_STRUCTURE_TYPE[ANIMATION_STRUCTURE_TYPE["RASTERED"] = 2] = "RASTERED";
        /**backward, rastered */
        ANIMATION_STRUCTURE_TYPE[ANIMATION_STRUCTURE_TYPE["RASTEREDREVERSE"] = 3] = "RASTEREDREVERSE";
    })(ANIMATION_STRUCTURE_TYPE || (ANIMATION_STRUCTURE_TYPE = {}));
    /**
     * Animation Class to hold all required Objects that are part of an Animation.
     * Also holds functions to play said Animation.
     * Can be added to a Node and played through [[ComponentAnimator]].
     * @author Lukas Scheuerle, HFU, 2019
     */
    class Animation extends FudgeCore.Mutable {
        constructor(_name, _animStructure = {}, _fps = 60) {
            super();
            this.totalTime = 0;
            this.labels = {};
            this.stepsPerSecond = 10;
            this.events = {};
            this.framesPerSecond = 60;
            // processed eventlist and animation strucutres for playback.
            this.eventsProcessed = new Map();
            this.animationStructuresProcessed = new Map();
            this.name = _name;
            this.animationStructure = _animStructure;
            this.animationStructuresProcessed.set(ANIMATION_STRUCTURE_TYPE.NORMAL, _animStructure);
            this.framesPerSecond = _fps;
            this.calculateTotalTime();
        }
        /**
         * Generates a new "Mutator" with the information to apply to the [[Node]] the [[ComponentAnimator]] is attached to with [[Node.applyAnimation()]].
         * @param _time The time at which the animation currently is at
         * @param _direction The direction in which the animation is supposed to be playing back. >0 == forward, 0 == stop, <0 == backwards
         * @param _playback The playbackmode the animation is supposed to be calculated with.
         * @returns a "Mutator" to apply.
         */
        getMutated(_time, _direction, _playback) {
            let m = {};
            if (_playback == FudgeCore.ANIMATION_PLAYBACK.TIMEBASED_CONTINOUS) {
                if (_direction >= 0) {
                    m = this.traverseStructureForMutator(this.getProcessedAnimationStructure(ANIMATION_STRUCTURE_TYPE.NORMAL), _time);
                }
                else {
                    m = this.traverseStructureForMutator(this.getProcessedAnimationStructure(ANIMATION_STRUCTURE_TYPE.REVERSE), _time);
                }
            }
            else {
                if (_direction >= 0) {
                    m = this.traverseStructureForMutator(this.getProcessedAnimationStructure(ANIMATION_STRUCTURE_TYPE.RASTERED), _time);
                }
                else {
                    m = this.traverseStructureForMutator(this.getProcessedAnimationStructure(ANIMATION_STRUCTURE_TYPE.RASTEREDREVERSE), _time);
                }
            }
            return m;
        }
        /**
         * Returns a list of the names of the events the [[ComponentAnimator]] needs to fire between _min and _max.
         * @param _min The minimum time (inclusive) to check between
         * @param _max The maximum time (exclusive) to check between
         * @param _playback The playback mode to check in. Has an effect on when the Events are fired.
         * @param _direction The direction the animation is supposed to run in. >0 == forward, 0 == stop, <0 == backwards
         * @returns a list of strings with the names of the custom events to fire.
         */
        getEventsToFire(_min, _max, _playback, _direction) {
            let eventList = [];
            let minSection = Math.floor(_min / this.totalTime);
            let maxSection = Math.floor(_max / this.totalTime);
            _min = _min % this.totalTime;
            _max = _max % this.totalTime;
            while (minSection <= maxSection) {
                let eventTriggers = this.getCorrectEventList(_direction, _playback);
                if (minSection == maxSection) {
                    eventList = eventList.concat(this.checkEventsBetween(eventTriggers, _min, _max));
                }
                else {
                    eventList = eventList.concat(this.checkEventsBetween(eventTriggers, _min, this.totalTime));
                    _min = 0;
                }
                minSection++;
            }
            return eventList;
        }
        /**
         * Adds an Event to the List of events.
         * @param _name The name of the event (needs to be unique per Animation).
         * @param _time The timestamp of the event (in milliseconds).
         */
        setEvent(_name, _time) {
            this.events[_name] = _time;
            this.eventsProcessed.clear();
        }
        /**
         * Removes the event with the given name from the list of events.
         * @param _name name of the event to remove.
         */
        removeEvent(_name) {
            delete this.events[_name];
            this.eventsProcessed.clear();
        }
        get getLabels() {
            //TODO: this actually needs testing
            let en = new Enumerator(this.labels);
            return en;
        }
        get fps() {
            return this.framesPerSecond;
        }
        set fps(_fps) {
            this.framesPerSecond = _fps;
            this.eventsProcessed.clear();
            this.animationStructuresProcessed.clear();
        }
        /**
         * (Re-)Calculate the total time of the Animation. Calculation-heavy, use only if actually needed.
         */
        calculateTotalTime() {
            this.totalTime = 0;
            this.traverseStructureForTime(this.animationStructure);
        }
        //#region transfer
        serialize() {
            let s = {
                idResource: this.idResource,
                name: this.name,
                labels: {},
                events: {},
                fps: this.framesPerSecond,
                sps: this.stepsPerSecond
            };
            for (let name in this.labels) {
                s.labels[name] = this.labels[name];
            }
            for (let name in this.events) {
                s.events[name] = this.events[name];
            }
            s.animationStructure = this.traverseStructureForSerialisation(this.animationStructure);
            return s;
        }
        deserialize(_serialization) {
            this.idResource = _serialization.idResource;
            this.name = _serialization.name;
            this.framesPerSecond = _serialization.fps;
            this.stepsPerSecond = _serialization.sps;
            this.labels = {};
            for (let name in _serialization.labels) {
                this.labels[name] = _serialization.labels[name];
            }
            this.events = {};
            for (let name in _serialization.events) {
                this.events[name] = _serialization.events[name];
            }
            this.eventsProcessed = new Map();
            this.animationStructure = this.traverseStructureForDeserialisation(_serialization.animationStructure);
            this.animationStructuresProcessed = new Map();
            this.calculateTotalTime();
            return this;
        }
        getMutator() {
            return this.serialize();
        }
        reduceMutator(_mutator) {
            delete _mutator.totalTime;
        }
        /**
         * Traverses an AnimationStructure and returns the Serialization of said Structure.
         * @param _structure The Animation Structure at the current level to transform into the Serialization.
         * @returns the filled Serialization.
         */
        traverseStructureForSerialisation(_structure) {
            let newSerialization = {};
            for (let n in _structure) {
                if (_structure[n] instanceof FudgeCore.AnimationSequence) {
                    newSerialization[n] = _structure[n].serialize();
                }
                else {
                    newSerialization[n] = this.traverseStructureForSerialisation(_structure[n]);
                }
            }
            return newSerialization;
        }
        /**
         * Traverses a Serialization to create a new AnimationStructure.
         * @param _serialization The serialization to transfer into an AnimationStructure
         * @returns the newly created AnimationStructure.
         */
        traverseStructureForDeserialisation(_serialization) {
            let newStructure = {};
            for (let n in _serialization) {
                if (_serialization[n].animationSequence) {
                    let animSeq = new FudgeCore.AnimationSequence();
                    newStructure[n] = animSeq.deserialize(_serialization[n]);
                }
                else {
                    newStructure[n] = this.traverseStructureForDeserialisation(_serialization[n]);
                }
            }
            return newStructure;
        }
        //#endregion
        /**
         * Finds the list of events to be used with these settings.
         * @param _direction The direction the animation is playing in.
         * @param _playback The playbackmode the animation is playing in.
         * @returns The correct AnimationEventTrigger Object to use
         */
        getCorrectEventList(_direction, _playback) {
            if (_playback != FudgeCore.ANIMATION_PLAYBACK.FRAMEBASED) {
                if (_direction >= 0) {
                    return this.getProcessedEventTrigger(ANIMATION_STRUCTURE_TYPE.NORMAL);
                }
                else {
                    return this.getProcessedEventTrigger(ANIMATION_STRUCTURE_TYPE.REVERSE);
                }
            }
            else {
                if (_direction >= 0) {
                    return this.getProcessedEventTrigger(ANIMATION_STRUCTURE_TYPE.RASTERED);
                }
                else {
                    return this.getProcessedEventTrigger(ANIMATION_STRUCTURE_TYPE.RASTEREDREVERSE);
                }
            }
        }
        /**
         * Traverses an AnimationStructure to turn it into the "Mutator" to return to the Component.
         * @param _structure The strcuture to traverse
         * @param _time the point in time to write the animation numbers into.
         * @returns The "Mutator" filled with the correct values at the given time.
         */
        traverseStructureForMutator(_structure, _time) {
            let newMutator = {};
            for (let n in _structure) {
                if (_structure[n] instanceof FudgeCore.AnimationSequence) {
                    newMutator[n] = _structure[n].evaluate(_time);
                }
                else {
                    newMutator[n] = this.traverseStructureForMutator(_structure[n], _time);
                }
            }
            return newMutator;
        }
        /**
         * Traverses the current AnimationStrcuture to find the totalTime of this animation.
         * @param _structure The structure to traverse
         */
        traverseStructureForTime(_structure) {
            for (let n in _structure) {
                if (_structure[n] instanceof FudgeCore.AnimationSequence) {
                    let sequence = _structure[n];
                    if (sequence.length > 0) {
                        let sequenceTime = sequence.getKey(sequence.length - 1).Time;
                        this.totalTime = sequenceTime > this.totalTime ? sequenceTime : this.totalTime;
                    }
                }
                else {
                    this.traverseStructureForTime(_structure[n]);
                }
            }
        }
        /**
         * Ensures the existance of the requested [[AnimationStrcuture]] and returns it.
         * @param _type the type of the structure to get
         * @returns the requested [[AnimationStructure]]
         */
        getProcessedAnimationStructure(_type) {
            if (!this.animationStructuresProcessed.has(_type)) {
                this.calculateTotalTime();
                let ae = {};
                switch (_type) {
                    case ANIMATION_STRUCTURE_TYPE.NORMAL:
                        ae = this.animationStructure;
                        break;
                    case ANIMATION_STRUCTURE_TYPE.REVERSE:
                        ae = this.traverseStructureForNewStructure(this.animationStructure, this.calculateReverseSequence.bind(this));
                        break;
                    case ANIMATION_STRUCTURE_TYPE.RASTERED:
                        ae = this.traverseStructureForNewStructure(this.animationStructure, this.calculateRasteredSequence.bind(this));
                        break;
                    case ANIMATION_STRUCTURE_TYPE.RASTEREDREVERSE:
                        ae = this.traverseStructureForNewStructure(this.getProcessedAnimationStructure(ANIMATION_STRUCTURE_TYPE.REVERSE), this.calculateRasteredSequence.bind(this));
                        break;
                    default:
                        return {};
                }
                this.animationStructuresProcessed.set(_type, ae);
            }
            return this.animationStructuresProcessed.get(_type);
        }
        /**
         * Ensures the existance of the requested [[AnimationEventTrigger]] and returns it.
         * @param _type The type of AnimationEventTrigger to get
         * @returns the requested [[AnimationEventTrigger]]
         */
        getProcessedEventTrigger(_type) {
            if (!this.eventsProcessed.has(_type)) {
                this.calculateTotalTime();
                let ev = {};
                switch (_type) {
                    case ANIMATION_STRUCTURE_TYPE.NORMAL:
                        ev = this.events;
                        break;
                    case ANIMATION_STRUCTURE_TYPE.REVERSE:
                        ev = this.calculateReverseEventTriggers(this.events);
                        break;
                    case ANIMATION_STRUCTURE_TYPE.RASTERED:
                        ev = this.calculateRasteredEventTriggers(this.events);
                        break;
                    case ANIMATION_STRUCTURE_TYPE.RASTEREDREVERSE:
                        ev = this.calculateRasteredEventTriggers(this.getProcessedEventTrigger(ANIMATION_STRUCTURE_TYPE.REVERSE));
                        break;
                    default:
                        return {};
                }
                this.eventsProcessed.set(_type, ev);
            }
            return this.eventsProcessed.get(_type);
        }
        /**
         * Traverses an existing structure to apply a recalculation function to the AnimationStructure to store in a new Structure.
         * @param _oldStructure The old structure to traverse
         * @param _functionToUse The function to use to recalculated the structure.
         * @returns A new Animation Structure with the recalulated Animation Sequences.
         */
        traverseStructureForNewStructure(_oldStructure, _functionToUse) {
            let newStructure = {};
            for (let n in _oldStructure) {
                if (_oldStructure[n] instanceof FudgeCore.AnimationSequence) {
                    newStructure[n] = _functionToUse(_oldStructure[n]);
                }
                else {
                    newStructure[n] = this.traverseStructureForNewStructure(_oldStructure[n], _functionToUse);
                }
            }
            return newStructure;
        }
        /**
         * Creates a reversed Animation Sequence out of a given Sequence.
         * @param _sequence The sequence to calculate the new sequence out of
         * @returns The reversed Sequence
         */
        calculateReverseSequence(_sequence) {
            let seq = new FudgeCore.AnimationSequence();
            for (let i = 0; i < _sequence.length; i++) {
                let oldKey = _sequence.getKey(i);
                let key = new FudgeCore.AnimationKey(this.totalTime - oldKey.Time, oldKey.Value, oldKey.SlopeOut, oldKey.SlopeIn, oldKey.Constant);
                seq.addKey(key);
            }
            return seq;
        }
        /**
         * Creates a rastered [[AnimationSequence]] out of a given sequence.
         * @param _sequence The sequence to calculate the new sequence out of
         * @returns the rastered sequence.
         */
        calculateRasteredSequence(_sequence) {
            let seq = new FudgeCore.AnimationSequence();
            let frameTime = 1000 / this.framesPerSecond;
            for (let i = 0; i < this.totalTime; i += frameTime) {
                let key = new FudgeCore.AnimationKey(i, _sequence.evaluate(i), 0, 0, true);
                seq.addKey(key);
            }
            return seq;
        }
        /**
         * Creates a new reversed [[AnimationEventTrigger]] object based on the given one.
         * @param _events the event object to calculate the new one out of
         * @returns the reversed event object
         */
        calculateReverseEventTriggers(_events) {
            let ae = {};
            for (let name in _events) {
                ae[name] = this.totalTime - _events[name];
            }
            return ae;
        }
        /**
         * Creates a rastered [[AnimationEventTrigger]] object based on the given one.
         * @param _events the event object to calculate the new one out of
         * @returns the rastered event object
         */
        calculateRasteredEventTriggers(_events) {
            let ae = {};
            let frameTime = 1000 / this.framesPerSecond;
            for (let name in _events) {
                ae[name] = _events[name] - (_events[name] % frameTime);
            }
            return ae;
        }
        /**
         * Checks which events lay between two given times and returns the names of the ones that do.
         * @param _eventTriggers The event object to check the events inside of
         * @param _min the minimum of the range to check between (inclusive)
         * @param _max the maximum of the range to check between (exclusive)
         * @returns an array of the names of the events in the given range.
         */
        checkEventsBetween(_eventTriggers, _min, _max) {
            let eventsToTrigger = [];
            for (let name in _eventTriggers) {
                if (_min <= _eventTriggers[name] && _eventTriggers[name] < _max) {
                    eventsToTrigger.push(name);
                }
            }
            return eventsToTrigger;
        }
    }
    FudgeCore.Animation = Animation;
})(FudgeCore || (FudgeCore = {}));
/// <reference path="../Transfer/Serializer.ts"/>
/// <reference path="../Transfer/Mutable.ts"/>
var FudgeCore;
/// <reference path="../Transfer/Serializer.ts"/>
/// <reference path="../Transfer/Mutable.ts"/>
(function (FudgeCore) {
    /**
     * Calculates the values between [[AnimationKey]]s.
     * Represented internally by a cubic function (`f(x) = ax³ + bx² + cx + d`).
     * Only needs to be recalculated when the keys change, so at runtime it should only be calculated once.
     * @author Lukas Scheuerle, HFU, 2019
     */
    class AnimationFunction {
        constructor(_keyIn, _keyOut = null) {
            this.a = 0;
            this.b = 0;
            this.c = 0;
            this.d = 0;
            this.keyIn = _keyIn;
            this.keyOut = _keyOut;
            this.calculate();
        }
        /**
         * Calculates the value of the function at the given time.
         * @param _time the point in time at which to evaluate the function in milliseconds. Will be corrected for offset internally.
         * @returns the value at the given time
         */
        evaluate(_time) {
            _time -= this.keyIn.Time;
            let time2 = _time * _time;
            let time3 = time2 * _time;
            return this.a * time3 + this.b * time2 + this.c * _time + this.d;
        }
        set setKeyIn(_keyIn) {
            this.keyIn = _keyIn;
            this.calculate();
        }
        set setKeyOut(_keyOut) {
            this.keyOut = _keyOut;
            this.calculate();
        }
        /**
         * (Re-)Calculates the parameters of the cubic function.
         * See https://math.stackexchange.com/questions/3173469/calculate-cubic-equation-from-two-points-and-two-slopes-variably
         * and https://jirkadelloro.github.io/FUDGE/Documentation/Logs/190410_Notizen_LS
         */
        calculate() {
            if (!this.keyIn) {
                this.d = this.c = this.b = this.a = 0;
                return;
            }
            if (!this.keyOut || this.keyIn.Constant) {
                this.d = this.keyIn.Value;
                this.c = this.b = this.a = 0;
                return;
            }
            let x1 = this.keyOut.Time - this.keyIn.Time;
            this.d = this.keyIn.Value;
            this.c = this.keyIn.SlopeOut;
            this.a = (-x1 * (this.keyIn.SlopeOut + this.keyOut.SlopeIn) - 2 * this.keyIn.Value + 2 * this.keyOut.Value) / -Math.pow(x1, 3);
            this.b = (this.keyOut.SlopeIn - this.keyIn.SlopeOut - 3 * this.a * Math.pow(x1, 2)) / (2 * x1);
        }
    }
    FudgeCore.AnimationFunction = AnimationFunction;
})(FudgeCore || (FudgeCore = {}));
/// <reference path="../Transfer/Serializer.ts"/>
/// <reference path="../Transfer/Mutable.ts"/>
var FudgeCore;
/// <reference path="../Transfer/Serializer.ts"/>
/// <reference path="../Transfer/Mutable.ts"/>
(function (FudgeCore) {
    /**
     * Holds information about set points in time, their accompanying values as well as their slopes.
     * Also holds a reference to the [[AnimationFunction]]s that come in and out of the sides. The [[AnimationFunction]]s are handled by the [[AnimationSequence]]s.
     * Saved inside an [[AnimationSequence]].
     * @author Lukas Scheuerle, HFU, 2019
     */
    class AnimationKey extends FudgeCore.Mutable {
        constructor(_time = 0, _value = 0, _slopeIn = 0, _slopeOut = 0, _constant = false) {
            super();
            this.constant = false;
            this.slopeIn = 0;
            this.slopeOut = 0;
            this.time = _time;
            this.value = _value;
            this.slopeIn = _slopeIn;
            this.slopeOut = _slopeOut;
            this.constant = _constant;
            this.broken = this.slopeIn != -this.slopeOut;
            this.functionOut = new FudgeCore.AnimationFunction(this, null);
        }
        get Time() {
            return this.time;
        }
        set Time(_time) {
            this.time = _time;
            this.functionIn.calculate();
            this.functionOut.calculate();
        }
        get Value() {
            return this.value;
        }
        set Value(_value) {
            this.value = _value;
            this.functionIn.calculate();
            this.functionOut.calculate();
        }
        get Constant() {
            return this.constant;
        }
        set Constant(_constant) {
            this.constant = _constant;
            this.functionIn.calculate();
            this.functionOut.calculate();
        }
        get SlopeIn() {
            return this.slopeIn;
        }
        set SlopeIn(_slope) {
            this.slopeIn = _slope;
            this.functionIn.calculate();
        }
        get SlopeOut() {
            return this.slopeOut;
        }
        set SlopeOut(_slope) {
            this.slopeOut = _slope;
            this.functionOut.calculate();
        }
        /**
         * Static comparation function to use in an array sort function to sort the keys by their time.
         * @param _a the animation key to check
         * @param _b the animation key to check against
         * @returns >0 if a>b, 0 if a=b, <0 if a<b
         */
        static compare(_a, _b) {
            return _a.time - _b.time;
        }
        //#region transfer
        serialize() {
            let s = {};
            s.time = this.time;
            s.value = this.value;
            s.slopeIn = this.slopeIn;
            s.slopeOut = this.slopeOut;
            s.constant = this.constant;
            return s;
        }
        deserialize(_serialization) {
            this.time = _serialization.time;
            this.value = _serialization.value;
            this.slopeIn = _serialization.slopeIn;
            this.slopeOut = _serialization.slopeOut;
            this.constant = _serialization.constant;
            this.broken = this.slopeIn != -this.slopeOut;
            return this;
        }
        getMutator() {
            return this.serialize();
        }
        reduceMutator(_mutator) {
            //
        }
    }
    FudgeCore.AnimationKey = AnimationKey;
})(FudgeCore || (FudgeCore = {}));
/// <reference path="../Transfer/Serializer.ts"/>
/// <reference path="../Transfer/Mutable.ts"/>
var FudgeCore;
/// <reference path="../Transfer/Serializer.ts"/>
/// <reference path="../Transfer/Mutable.ts"/>
(function (FudgeCore) {
    /**
     * A sequence of [[AnimationKey]]s that is mapped to an attribute of a [[Node]] or its [[Component]]s inside the [[Animation]].
     * Provides functions to modify said keys
     * @author Lukas Scheuerle, HFU, 2019
     */
    class AnimationSequence extends FudgeCore.Mutable {
        constructor() {
            super(...arguments);
            this.keys = [];
        }
        /**
         * Evaluates the sequence at the given point in time.
         * @param _time the point in time at which to evaluate the sequence in milliseconds.
         * @returns the value of the sequence at the given time. 0 if there are no keys.
         */
        evaluate(_time) {
            if (this.keys.length == 0)
                return 0; //TODO: shouldn't return 0 but something indicating no change, like null. probably needs to be changed in Node as well to ignore non-numeric values in the applyAnimation function
            if (this.keys.length == 1 || this.keys[0].Time >= _time)
                return this.keys[0].Value;
            for (let i = 0; i < this.keys.length - 1; i++) {
                if (this.keys[i].Time <= _time && this.keys[i + 1].Time > _time) {
                    return this.keys[i].functionOut.evaluate(_time);
                }
            }
            return this.keys[this.keys.length - 1].Value;
        }
        /**
         * Adds a new key to the sequence.
         * @param _key the key to add
         */
        addKey(_key) {
            this.keys.push(_key);
            this.keys.sort(FudgeCore.AnimationKey.compare);
            this.regenerateFunctions();
        }
        /**
         * Removes a given key from the sequence.
         * @param _key the key to remove
         */
        removeKey(_key) {
            for (let i = 0; i < this.keys.length; i++) {
                if (this.keys[i] == _key) {
                    this.keys.splice(i, 1);
                    this.regenerateFunctions();
                    return;
                }
            }
        }
        /**
         * Removes the Animation Key at the given index from the keys.
         * @param _index the zero-based index at which to remove the key
         * @returns the removed AnimationKey if successful, null otherwise.
         */
        removeKeyAtIndex(_index) {
            if (_index < 0 || _index >= this.keys.length) {
                return null;
            }
            let ak = this.keys[_index];
            this.keys.splice(_index, 1);
            this.regenerateFunctions();
            return ak;
        }
        /**
         * Gets a key from the sequence at the desired index.
         * @param _index the zero-based index at which to get the key
         * @returns the AnimationKey at the index if it exists, null otherwise.
         */
        getKey(_index) {
            if (_index < 0 || _index >= this.keys.length)
                return null;
            return this.keys[_index];
        }
        get length() {
            return this.keys.length;
        }
        //#region transfer
        serialize() {
            let s = {
                keys: [],
                animationSequence: true
            };
            for (let i = 0; i < this.keys.length; i++) {
                s.keys[i] = this.keys[i].serialize();
            }
            return s;
        }
        deserialize(_serialization) {
            for (let i = 0; i < _serialization.keys.length; i++) {
                // this.keys.push(<AnimationKey>Serializer.deserialize(_serialization.keys[i]));
                let k = new FudgeCore.AnimationKey();
                k.deserialize(_serialization.keys[i]);
                this.keys[i] = k;
            }
            this.regenerateFunctions();
            return this;
        }
        reduceMutator(_mutator) {
            //
        }
        //#endregion
        /**
         * Utility function that (re-)generates all functions in the sequence.
         */
        regenerateFunctions() {
            for (let i = 0; i < this.keys.length; i++) {
                let f = new FudgeCore.AnimationFunction(this.keys[i]);
                this.keys[i].functionOut = f;
                if (i == this.keys.length - 1) {
                    //TODO: check if this is even useful. Maybe update the runcondition to length - 1 instead. Might be redundant if functionIn is removed, see TODO in AnimationKey.
                    f.setKeyOut = this.keys[0];
                    this.keys[0].functionIn = f;
                    break;
                }
                f.setKeyOut = this.keys[i + 1];
                this.keys[i + 1].functionIn = f;
            }
        }
    }
    FudgeCore.AnimationSequence = AnimationSequence;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Describes the [[Audio]] class in which all Audio Data is stored.
     * Audio will be given to the [[ComponentAudio]] for further usage.
     * @authors Thomas Dorner, HFU, 2019
     */
    class Audio {
        /**
         * Constructor for the [[Audio]] Class
         * @param _audioContext from [[AudioSettings]]
         * @param _gainValue 0 for muted | 1 for max volume
         */
        constructor(_audioSettings, _url, _gainValue, _loop) {
            this.init(_audioSettings, _url, _gainValue, _loop);
        }
        async init(_audioSettings, _url, _gainValue, _loop) {
            this.url = _url;
            // Get AudioBuffer
            const bufferProm = _audioSettings.getAudioSession().urlToBuffer(_audioSettings.getAudioContext(), _url);
            while (!bufferProm) {
                console.log("Waiting for Promise..");
            }
            await bufferProm.then(val => {
                this.audioBuffer = val;
            });
            this.localGain = _audioSettings.getAudioContext().createGain();
            this.localGainValue = _gainValue;
            this.localGain.gain.value = this.localGainValue;
            this.createAudio(_audioSettings, this.audioBuffer);
            this.isLooping = _loop;
        }
        initBufferSource(_audioSettings) {
            this.bufferSource = _audioSettings.getAudioContext().createBufferSource();
            this.bufferSource.buffer = this.audioBuffer;
            this.beginLoop();
        }
        setBufferSourceNode(_bufferSourceNode) {
            this.bufferSource = _bufferSourceNode;
        }
        getBufferSourceNode() {
            return this.bufferSource;
        }
        setLocalGain(_localGain) {
            this.localGain = _localGain;
        }
        getLocalGain() {
            return this.localGain;
        }
        setLocalGainValue(_localGainValue) {
            this.localGainValue = _localGainValue;
            this.localGain.gain.value = this.localGainValue;
        }
        getLocalGainValue() {
            return this.localGainValue;
        }
        setLooping(_isLooping) {
            this.isLooping = _isLooping;
        }
        getLooping() {
            return this.isLooping;
        }
        setBufferSource(_buffer) {
            this.audioBuffer = _buffer;
            this.bufferSource.buffer = _buffer;
        }
        getBufferSource() {
            return this.audioBuffer;
        }
        /**
         * createAudio builds an [[Audio]] to use with the [[ComponentAudio]]
         * @param _audioContext from [[AudioSettings]]
         * @param _audioBuffer from [[AudioSessionData]]
         */
        createAudio(_audioSettings, _audioBuffer) {
            this.audioBuffer = _audioBuffer;
            this.initBufferSource(_audioSettings);
            return this.audioBuffer;
        }
        beginLoop() {
            this.bufferSource.loop = this.isLooping;
        }
    }
    FudgeCore.Audio = Audio;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Add an [[AudioDelay]] to an [[Audio]]
     * @authors Thomas Dorner, HFU, 2019
     */
    class AudioDelay {
        constructor(_audioSettings, _delay) {
            this.audioDelay = _audioSettings.getAudioContext().createDelay(_delay);
            this.setDelay(_audioSettings, _delay);
        }
        setDelay(_audioSettings, _delay) {
            this.delay = _delay;
            this.audioDelay.delayTime.setValueAtTime(this.delay, _audioSettings.getAudioContext().currentTime);
        }
        getDelay() {
            return this.delay;
        }
    }
    FudgeCore.AudioDelay = AudioDelay;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Add an [[AudioFilter]] to an [[Audio]]
     * @authors Thomas Dorner, HFU, 2019
     */
    class AudioFilter {
        constructor(_audioSettings, _filterType, _frequency, _gain, _quality) {
            this.initFilter(_audioSettings, _filterType, _frequency, _gain, _quality);
        }
        initFilter(_audioSettings, _filterType, _frequency, _gain, _quality) {
            this.audioFilter = _audioSettings.getAudioContext().createBiquadFilter();
            this.setFilterType(_filterType);
            this.setFrequency(_audioSettings, _frequency);
            this.setGain(_audioSettings, _gain);
            this.setQuality(_quality);
        }
        setFilterType(_filterType) {
            this.filterType = _filterType;
            this.audioFilter.type = this.filterType;
        }
        getFilterType() {
            return this.filterType;
        }
        setFrequency(_audioSettings, _frequency) {
            this.audioFilter.frequency.setValueAtTime(_frequency, _audioSettings.getAudioContext().currentTime);
        }
        getFrequency() {
            return this.audioFilter.frequency.value;
        }
        setGain(_audioSettings, _gain) {
            this.audioFilter.frequency.setValueAtTime(_gain, _audioSettings.getAudioContext().currentTime);
        }
        getGain() {
            return this.audioFilter.gain.value;
        }
        setQuality(_quality) {
            this.audioFilter.Q.value = _quality;
        }
        getQuality() {
            return this.audioFilter.Q.value;
        }
    }
    FudgeCore.AudioFilter = AudioFilter;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * [[AudioLocalisation]] describes the Audio Panner used in [[ComponentAudio]],
     * which contains data for Position, Orientation and other data needed to localize the Audio in a 3D space.
     * @authors Thomas Dorner, HFU, 2019
     */
    class AudioLocalisation {
        /**
         * Constructor for the [[AudioLocalisation]] Class
         * @param _audioContext from [[AudioSettings]]
         */
        constructor(_audioSettings) {
            this.pannerNode = _audioSettings.getAudioContext().createPanner();
            this.initDefaultValues();
        }
        updatePositions(_position, _orientation) {
            this.setPannerPosition(_position);
            this.setPannerOrientation(_orientation);
        }
        /**
        * We will call setPannerPosition whenever there is a need to change Positions.
        * All the position values should be identical to the current Position this is attached to.
        *
        *      |
        *      o---
        *    /  __
        *      |_| Position
        *
        */
        setPannerPosition(_position) {
            this.position = _position;
            this.pannerNode.positionX.value = this.position.x;
            this.pannerNode.positionY.value = -this.position.z;
            this.pannerNode.positionZ.value = this.position.y;
        }
        getPannerPosition() {
            return this.position;
        }
        /**
         * Set Position for orientation target
         *
         *      |
         *      o---
         *    /  __
         *      |_|
         *        \
         *       Target
         */
        setPannerOrientation(_orientation) {
            this.orientation = _orientation;
            this.pannerNode.orientationX.value = this.orientation.x;
            this.pannerNode.orientationY.value = -this.orientation.z;
            this.pannerNode.orientationZ.value = this.orientation.y;
        }
        getPannerOrientation() {
            return this.orientation;
        }
        setDistanceModel(_distanceModelType) {
            this.distanceModel = _distanceModelType;
            this.pannerNode.distanceModel = this.distanceModel;
        }
        getDistanceModel() {
            return this.distanceModel;
        }
        setPanningModel(_panningModelType) {
            this.panningModel = _panningModelType;
            this.pannerNode.panningModel = this.panningModel;
        }
        getPanningModel() {
            return this.panningModel;
        }
        setRefDistance(_refDistance) {
            this.refDistance = _refDistance;
            this.pannerNode.refDistance = this.refDistance;
        }
        getRefDistance() {
            return this.refDistance;
        }
        setMaxDistance(_maxDistance) {
            this.maxDistance = _maxDistance;
            this.pannerNode.maxDistance = this.maxDistance;
        }
        getMaxDistance() {
            return this.maxDistance;
        }
        setRolloffFactor(_rolloffFactor) {
            this.rolloffFactor = _rolloffFactor;
            this.pannerNode.rolloffFactor = this.rolloffFactor;
        }
        getRolloffFactor() {
            return this.rolloffFactor;
        }
        setConeInnerAngle(_coneInnerAngle) {
            this.coneInnerAngle = _coneInnerAngle;
            this.pannerNode.coneInnerAngle = this.coneInnerAngle;
        }
        getConeInnerAngle() {
            return this.coneInnerAngle;
        }
        setConeOuterAngle(_coneOuterAngle) {
            this.coneOuterAngle = _coneOuterAngle;
            this.pannerNode.coneOuterAngle = this.coneOuterAngle;
        }
        getConeOuterAngle() {
            return this.coneOuterAngle;
        }
        setConeOuterGain(_coneOuterGain) {
            this.coneOuterGain = _coneOuterGain;
            this.pannerNode.coneOuterGain = this.coneOuterGain;
        }
        getConeOuterGain() {
            return this.coneOuterGain;
        }
        /**
         * Show all Settings inside of [[AudioLocalisation]].
         * Use for Debugging purposes.
         */
        showLocalisationSettings() {
            console.log("------------------------------");
            console.log("Show all Settings of Panner");
            console.log("------------------------------");
            console.log("Panner Position: X: " + this.pannerNode.positionX.value + " | Y: " + this.pannerNode.positionY.value + " | Z: " + this.pannerNode.positionZ.value);
            console.log("Panner Orientation: X: " + this.pannerNode.orientationX.value + " | Y: " + this.pannerNode.orientationY.value + " | Z: " + this.pannerNode.orientationZ.value);
            console.log("Distance Model Type: " + this.distanceModel);
            console.log("Panner Model Type: " + this.panningModel);
            console.log("Ref Distance: " + this.refDistance);
            console.log("Max Distance: " + this.maxDistance);
            console.log("Rolloff Factor: " + this.rolloffFactor);
            console.log("Cone Inner Angle: " + this.coneInnerAngle);
            console.log("Cone Outer Angle: " + this.coneOuterAngle);
            console.log("Cone Outer Gain: " + this.coneOuterGain);
            console.log("------------------------------");
        }
        initDefaultValues() {
            this.setPanningModel("HRTF");
            this.setDistanceModel("inverse");
            this.setConeInnerAngle(90);
            this.setConeOuterAngle(270);
            this.setConeOuterGain(0);
            this.setRefDistance(1);
            this.setMaxDistance(5);
            this.setRolloffFactor(1);
            this.showLocalisationSettings();
        }
    }
    FudgeCore.AudioLocalisation = AudioLocalisation;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Add an [[AudioFilter]] to an [[Audio]]
     * @authors Thomas Dorner, HFU, 2019
     */
    class AudioOscillator {
        constructor(_audioSettings, _oscillatorType) {
            this.audioOscillator = _audioSettings.getAudioContext().createOscillator();
            this.localGain = _audioSettings.getAudioContext().createGain();
            this.oscillatorType = _oscillatorType;
            if (this.oscillatorType != "custom") {
                this.audioOscillator.type = this.oscillatorType;
            }
            else {
                if (!this.oscillatorWave) {
                    this.audioOscillator.setPeriodicWave(this.oscillatorWave);
                }
                else {
                    console.log("Create a Custom Periodic Wave first to use Custom Type");
                }
            }
        }
        setOscillatorType(_oscillatorType) {
            if (this.oscillatorType != "custom") {
                this.audioOscillator.type = this.oscillatorType;
            }
            else {
                if (!this.oscillatorWave) {
                    this.audioOscillator.setPeriodicWave(this.oscillatorWave);
                }
            }
        }
        getOscillatorType() {
            return this.oscillatorType;
        }
        createPeriodicWave(_audioSettings, _real, _imag) {
            let waveReal = new Float32Array(2);
            waveReal[0] = _real.startpoint;
            waveReal[1] = _real.endpoint;
            let waveImag = new Float32Array(2);
            waveImag[0] = _imag.startpoint;
            waveImag[1] = _imag.endpoint;
            this.oscillatorWave = _audioSettings.getAudioContext().createPeriodicWave(waveReal, waveImag);
        }
        setLocalGain(_localGain) {
            this.localGain = _localGain;
        }
        getLocalGain() {
            return this.localGain;
        }
        setLocalGainValue(_localGainValue) {
            this.localGainValue = _localGainValue;
            this.localGain.gain.value = this.localGainValue;
        }
        getLocalGainValue() {
            return this.localGainValue;
        }
        setFrequency(_audioSettings, _frequency) {
            this.frequency = _frequency;
            this.audioOscillator.frequency.setValueAtTime(this.frequency, _audioSettings.getAudioContext().currentTime);
        }
        getFrequency() {
            return this.frequency;
        }
        createSnare(_audioSettings) {
            this.setOscillatorType("triangle");
            this.setFrequency(_audioSettings, 100);
            this.setLocalGainValue(0);
            this.localGain.gain.setValueAtTime(0, _audioSettings.getAudioContext().currentTime);
            this.localGain.gain.exponentialRampToValueAtTime(0.01, _audioSettings.getAudioContext().currentTime + .1);
            this.audioOscillator.connect(this.localGain);
        }
    }
    FudgeCore.AudioOscillator = AudioOscillator;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Describes Data Handler for all Audio Sources
     * @authors Thomas Dorner, HFU, 2019
     */
    class AudioSessionData {
        /**
         * Constructor of the [[AudioSessionData]] Class.
         */
        constructor() {
            this.dataArray = new Array();
        }
        /**
         * Decoding Audio Data
         * Asynchronous Function to permit the loading of multiple Data Sources at the same time
         * @param _audioContext AudioContext from AudioSettings
         * @param _url URL as String for Data fetching
         */
        async urlToBuffer(_audioContext, _url) {
            let initObject = {
                method: "GET",
                mode: "same-origin",
                cache: "no-cache",
                headers: {
                    "Content-Type": "audio/mpeg3"
                },
                redirect: "follow" // default -> follow
            };
            let buffer = null;
            for (let x = 0; x < this.dataArray.length; x++) {
                if (this.dataArray[x].url == _url) {
                    console.log("Existing URL found");
                    if (this.dataArray[x].buffer == null) {
                        const response = await window.fetch(_url, initObject);
                        const arrayBuffer = await response.arrayBuffer();
                        const decodedAudio = await _audioContext.decodeAudioData(arrayBuffer);
                        this.pushBufferInArray(_url, decodedAudio);
                        return decodedAudio;
                    }
                    else {
                        buffer = await this.dataArray[x].buffer;
                        return this.dataArray[x].buffer;
                    }
                }
            }
            if (buffer == null) {
                try {
                    this.pushUrlInArray(_url);
                    const response = await window.fetch(_url, initObject);
                    const arrayBuffer = await response.arrayBuffer();
                    const decodedAudio = await _audioContext.decodeAudioData(arrayBuffer);
                    this.pushBufferInArray(_url, decodedAudio);
                    return decodedAudio;
                }
                catch (e) {
                    this.logErrorFetch(e);
                    return null;
                }
            }
            else {
                return null;
            }
        }
        /**
         * Push URL into Data Array to create a Placeholder in which the Buffer can be placed at a later time
         */
        /**
         *
         * @param _url
         * @param _audioBuffer
         */
        pushBufferInArray(_url, _audioBuffer) {
            for (let x = 0; x < this.dataArray.length; x++) {
                if (this.dataArray[x].url == _url) {
                    if (this.dataArray[x].buffer == null) {
                        this.dataArray[x].buffer = _audioBuffer;
                        return;
                    }
                }
            }
        }
        /**
         * Create a new log for the Data Array.
         * Uses a url and creates a placeholder for the AudioBuffer.
         * The AudioBuffer gets added as soon as it is created.
         * @param _url Add a url to a wanted resource as a string
         */
        pushUrlInArray(_url) {
            let data;
            data = {
                url: _url,
                buffer: null
            };
            this.dataArray.push(data);
        }
        /**
         * Show all Data in Array.
         * Use this for Debugging purposes.
         */
        showDataInArray() {
            for (let x = 0; x < this.dataArray.length; x++) {
                console.log("Array Data: " + this.dataArray[x].url + this.dataArray[x].buffer);
            }
        }
        /**
         * Error Message for Data Fetching
         * @param e Error
         */
        logErrorFetch(_error) {
            console.log("Audio error", _error);
        }
    }
    FudgeCore.AudioSessionData = AudioSessionData;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Describes Global Audio Settings.
     * Is meant to be used as a Menu option.
     * @authors Thomas Dorner, HFU, 2019
     */
    class AudioSettings {
        //
        /**
         * Constructor for the [[AudioSettings]] Class.
         * Main class for all Audio Classes.
         * Need to create this first, when working with sounds.
         */
        constructor() {
            this.setAudioContext(new AudioContext({ latencyHint: "interactive", sampleRate: 44100 }));
            //this.globalAudioContext.resume();
            this.masterGain = this.globalAudioContext.createGain();
            this.setMasterGainValue(1);
            this.setAudioSession(new FudgeCore.AudioSessionData());
            this.masterGain.connect(this.globalAudioContext.destination);
        }
        setMasterGainValue(_masterGainValue) {
            this.masterGainValue = _masterGainValue;
            this.masterGain.gain.value = this.masterGainValue;
        }
        getMasterGainValue() {
            return this.masterGainValue;
        }
        getAudioContext() {
            return this.globalAudioContext;
        }
        setAudioContext(_audioContext) {
            this.globalAudioContext = _audioContext;
        }
        getAudioSession() {
            return this.audioSessionData;
        }
        setAudioSession(_audioSession) {
            this.audioSessionData = _audioSession;
        }
        /**
         * Pauses the progression of time of the AudioContext.
         */
        suspendAudioContext() {
            this.globalAudioContext.suspend();
        }
        /**
         * Resumes the progression of time of the AudioContext after pausing it.
         */
        resumeAudioContext() {
            this.globalAudioContext.resume();
        }
    }
    FudgeCore.AudioSettings = AudioSettings;
})(FudgeCore || (FudgeCore = {}));
//<reference path="../Coats/Coat.ts"/>
var FudgeCore;
//<reference path="../Coats/Coat.ts"/>
(function (FudgeCore) {
    class RenderInjector {
        static decorateCoat(_constructor) {
            let coatInjection = RenderInjector.coatInjections[_constructor.name];
            if (!coatInjection) {
                FudgeCore.Debug.error("No injection decorator defined for " + _constructor.name);
            }
            Object.defineProperty(_constructor.prototype, "useRenderData", {
                value: coatInjection
            });
        }
        static injectRenderDataForCoatColored(_renderShader) {
            let colorUniformLocation = _renderShader.uniforms["u_color"];
            // let { r, g, b, a } = (<CoatColored>this).color;
            // let color: Float32Array = new Float32Array([r, g, b, a]);
            let color = this.color.getArray();
            FudgeCore.RenderOperator.getRenderingContext().uniform4fv(colorUniformLocation, color);
        }
        static injectRenderDataForCoatTextured(_renderShader) {
            let crc3 = FudgeCore.RenderOperator.getRenderingContext();
            if (this.renderData) {
                // buffers exist
                crc3.activeTexture(WebGL2RenderingContext.TEXTURE0);
                crc3.bindTexture(WebGL2RenderingContext.TEXTURE_2D, this.renderData["texture0"]);
                crc3.uniform1i(_renderShader.uniforms["u_texture"], 0);
            }
            else {
                this.renderData = {};
                // TODO: check if all WebGL-Creations are asserted
                const texture = FudgeCore.RenderManager.assert(crc3.createTexture());
                crc3.bindTexture(WebGL2RenderingContext.TEXTURE_2D, texture);
                try {
                    crc3.texImage2D(crc3.TEXTURE_2D, 0, crc3.RGBA, crc3.RGBA, crc3.UNSIGNED_BYTE, this.texture.image);
                    crc3.texImage2D(WebGL2RenderingContext.TEXTURE_2D, 0, WebGL2RenderingContext.RGBA, WebGL2RenderingContext.RGBA, WebGL2RenderingContext.UNSIGNED_BYTE, this.texture.image);
                }
                catch (_e) {
                    FudgeCore.Debug.error(_e);
                }
                crc3.texParameteri(WebGL2RenderingContext.TEXTURE_2D, WebGL2RenderingContext.TEXTURE_MAG_FILTER, WebGL2RenderingContext.NEAREST);
                crc3.texParameteri(WebGL2RenderingContext.TEXTURE_2D, WebGL2RenderingContext.TEXTURE_MIN_FILTER, WebGL2RenderingContext.NEAREST);
                crc3.generateMipmap(crc3.TEXTURE_2D);
                this.renderData["texture0"] = texture;
                crc3.bindTexture(WebGL2RenderingContext.TEXTURE_2D, null);
                this.useRenderData(_renderShader);
            }
        }
        static injectRenderDataForCoatMatCap(_renderShader) {
            let crc3 = FudgeCore.RenderOperator.getRenderingContext();
            let colorUniformLocation = _renderShader.uniforms["u_tint_color"];
            let { r, g, b, a } = this.tintColor;
            let tintColorArray = new Float32Array([r, g, b, a]);
            crc3.uniform4fv(colorUniformLocation, tintColorArray);
            let floatUniformLocation = _renderShader.uniforms["u_flatmix"];
            let flatMix = this.flatMix;
            crc3.uniform1f(floatUniformLocation, flatMix);
            if (this.renderData) {
                // buffers exist
                crc3.activeTexture(WebGL2RenderingContext.TEXTURE0);
                crc3.bindTexture(WebGL2RenderingContext.TEXTURE_2D, this.renderData["texture0"]);
                crc3.uniform1i(_renderShader.uniforms["u_texture"], 0);
            }
            else {
                this.renderData = {};
                // TODO: check if all WebGL-Creations are asserted
                const texture = FudgeCore.RenderManager.assert(crc3.createTexture());
                crc3.bindTexture(WebGL2RenderingContext.TEXTURE_2D, texture);
                try {
                    crc3.texImage2D(crc3.TEXTURE_2D, 0, crc3.RGBA, crc3.RGBA, crc3.UNSIGNED_BYTE, this.texture.image);
                    crc3.texImage2D(WebGL2RenderingContext.TEXTURE_2D, 0, WebGL2RenderingContext.RGBA, WebGL2RenderingContext.RGBA, WebGL2RenderingContext.UNSIGNED_BYTE, this.texture.image);
                }
                catch (_e) {
                    FudgeCore.Debug.error(_e);
                }
                crc3.texParameteri(WebGL2RenderingContext.TEXTURE_2D, WebGL2RenderingContext.TEXTURE_MAG_FILTER, WebGL2RenderingContext.NEAREST);
                crc3.texParameteri(WebGL2RenderingContext.TEXTURE_2D, WebGL2RenderingContext.TEXTURE_MIN_FILTER, WebGL2RenderingContext.NEAREST);
                crc3.generateMipmap(crc3.TEXTURE_2D);
                this.renderData["texture0"] = texture;
                crc3.bindTexture(WebGL2RenderingContext.TEXTURE_2D, null);
                this.useRenderData(_renderShader);
            }
        }
    }
    RenderInjector.coatInjections = {
        "CoatColored": RenderInjector.injectRenderDataForCoatColored,
        "CoatTextured": RenderInjector.injectRenderDataForCoatTextured,
        "CoatMatCap": RenderInjector.injectRenderDataForCoatMatCap
    };
    FudgeCore.RenderInjector = RenderInjector;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Base class for RenderManager, handling the connection to the rendering system, in this case WebGL.
     * Methods and attributes of this class should not be called directly, only through [[RenderManager]]
     */
    class RenderOperator {
        /**
        * Checks the first parameter and throws an exception with the WebGL-errorcode if the value is null
        * @param _value // value to check against null
        * @param _message // optional, additional message for the exception
        */
        static assert(_value, _message = "") {
            if (_value === null)
                throw new Error(`Assertion failed. ${_message}, WebGL-Error: ${RenderOperator.crc3 ? RenderOperator.crc3.getError() : ""}`);
            return _value;
        }
        /**
         * Initializes offscreen-canvas, renderingcontext and hardware viewport.
         */
        static initialize(_antialias = false, _alpha = false) {
            let contextAttributes = { alpha: _alpha, antialias: _antialias };
            let canvas = document.createElement("canvas");
            RenderOperator.crc3 = RenderOperator.assert(canvas.getContext("webgl2", contextAttributes), "WebGL-context couldn't be created");
            // Enable backface- and zBuffer-culling.
            RenderOperator.crc3.enable(WebGL2RenderingContext.CULL_FACE);
            RenderOperator.crc3.enable(WebGL2RenderingContext.DEPTH_TEST);
            // RenderOperator.crc3.pixelStorei(WebGL2RenderingContext.UNPACK_FLIP_Y_WEBGL, true);
            RenderOperator.rectViewport = RenderOperator.getCanvasRect();
            RenderOperator.renderShaderRayCast = RenderOperator.createProgram(FudgeCore.ShaderRayCast);
        }
        /**
         * Return a reference to the offscreen-canvas
         */
        static getCanvas() {
            return RenderOperator.crc3.canvas; // TODO: enable OffscreenCanvas
        }
        /**
         * Return a reference to the rendering context
         */
        static getRenderingContext() {
            return RenderOperator.crc3;
        }
        /**
         * Return a rectangle describing the size of the offscreen-canvas. x,y are 0 at all times.
         */
        static getCanvasRect() {
            let canvas = RenderOperator.crc3.canvas;
            return FudgeCore.Rectangle.GET(0, 0, canvas.width, canvas.height);
        }
        /**
         * Set the size of the offscreen-canvas.
         */
        static setCanvasSize(_width, _height) {
            RenderOperator.crc3.canvas.width = _width;
            RenderOperator.crc3.canvas.height = _height;
        }
        /**
         * Set the area on the offscreen-canvas to render the camera image to.
         * @param _rect
         */
        static setViewportRectangle(_rect) {
            Object.assign(RenderOperator.rectViewport, _rect);
            RenderOperator.crc3.viewport(_rect.x, _rect.y, _rect.width, _rect.height);
        }
        /**
         * Retrieve the area on the offscreen-canvas the camera image gets rendered to.
         */
        static getViewportRectangle() {
            return RenderOperator.rectViewport;
        }
        /**
         * Convert light data to flat arrays
         * TODO: this method appears to be obsolete...?
         */
        static createRenderLights(_lights) {
            let renderLights = {};
            for (let entry of _lights) {
                // TODO: simplyfy, since direction is now handled by ComponentLight
                switch (entry[0]) {
                    case FudgeCore.LightAmbient.name:
                        let ambient = [];
                        for (let cmpLight of entry[1]) {
                            let c = cmpLight.light.color;
                            ambient.push(c.r, c.g, c.b, c.a);
                        }
                        renderLights["u_ambient"] = new Float32Array(ambient);
                        break;
                    case FudgeCore.LightDirectional.name:
                        let directional = [];
                        for (let cmpLight of entry[1]) {
                            let c = cmpLight.light.color;
                            // let d: Vector3 = (<LightDirectional>light.getLight()).direction;
                            directional.push(c.r, c.g, c.b, c.a, 0, 0, 1);
                        }
                        renderLights["u_directional"] = new Float32Array(directional);
                        break;
                    default:
                        FudgeCore.Debug.warn("Shaderstructure undefined for", entry[0]);
                }
            }
            return renderLights;
        }
        /**
         * Set light data in shaders
         */
        static setLightsInShader(_renderShader, _lights) {
            RenderOperator.useProgram(_renderShader);
            let uni = _renderShader.uniforms;
            let ambient = uni["u_ambient.color"];
            if (ambient) {
                let cmpLights = _lights.get("LightAmbient");
                if (cmpLights) {
                    // TODO: add up ambient lights to a single color
                    // let result: Color = new Color(0, 0, 0, 1);
                    for (let cmpLight of cmpLights)
                        // for now, only the last is relevant
                        RenderOperator.crc3.uniform4fv(ambient, cmpLight.light.color.getArray());
                }
            }
            let nDirectional = uni["u_nLightsDirectional"];
            if (nDirectional) {
                let cmpLights = _lights.get("LightDirectional");
                if (cmpLights) {
                    let n = cmpLights.length;
                    RenderOperator.crc3.uniform1ui(nDirectional, n);
                    for (let i = 0; i < n; i++) {
                        let cmpLight = cmpLights[i];
                        RenderOperator.crc3.uniform4fv(uni[`u_directional[${i}].color`], cmpLight.light.color.getArray());
                        let direction = FudgeCore.Vector3.Z();
                        direction.transform(cmpLight.pivot);
                        direction.transform(cmpLight.getContainer().mtxWorld);
                        RenderOperator.crc3.uniform3fv(uni[`u_directional[${i}].direction`], direction.get());
                    }
                }
            }
            // debugger;
        }
        /**
         * Draw a mesh buffer using the given infos and the complete projection matrix
         * @param _renderShader
         * @param _renderBuffers
         * @param _renderCoat
         * @param _world
         * @param _projection
         */
        static draw(_renderShader, _renderBuffers, _renderCoat, _world, _projection) {
            RenderOperator.useProgram(_renderShader);
            // RenderOperator.useBuffers(_renderBuffers);
            // RenderOperator.useParameter(_renderCoat);
            RenderOperator.crc3.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, _renderBuffers.vertices);
            RenderOperator.crc3.enableVertexAttribArray(_renderShader.attributes["a_position"]);
            RenderOperator.setAttributeStructure(_renderShader.attributes["a_position"], FudgeCore.Mesh.getBufferSpecification());
            RenderOperator.crc3.bindBuffer(WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER, _renderBuffers.indices);
            if (_renderShader.attributes["a_textureUVs"]) {
                RenderOperator.crc3.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, _renderBuffers.textureUVs);
                RenderOperator.crc3.enableVertexAttribArray(_renderShader.attributes["a_textureUVs"]); // enable the buffer
                RenderOperator.crc3.vertexAttribPointer(_renderShader.attributes["a_textureUVs"], 2, WebGL2RenderingContext.FLOAT, false, 0, 0);
            }
            // Supply matrixdata to shader. 
            let uProjection = _renderShader.uniforms["u_projection"];
            RenderOperator.crc3.uniformMatrix4fv(uProjection, false, _projection.get());
            if (_renderShader.uniforms["u_world"]) {
                let uWorld = _renderShader.uniforms["u_world"];
                RenderOperator.crc3.uniformMatrix4fv(uWorld, false, _world.get());
                RenderOperator.crc3.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, _renderBuffers.normalsFace);
                RenderOperator.crc3.enableVertexAttribArray(_renderShader.attributes["a_normal"]);
                RenderOperator.setAttributeStructure(_renderShader.attributes["a_normal"], FudgeCore.Mesh.getBufferSpecification());
            }
            // TODO: this is all that's left of coat handling in RenderOperator, due to injection. So extra reference from node to coat is unnecessary
            _renderCoat.coat.useRenderData(_renderShader);
            // Draw call
            // RenderOperator.crc3.drawElements(WebGL2RenderingContext.TRIANGLES, Mesh.getBufferSpecification().offset, _renderBuffers.nIndices);
            RenderOperator.crc3.drawElements(WebGL2RenderingContext.TRIANGLES, _renderBuffers.nIndices, WebGL2RenderingContext.UNSIGNED_SHORT, 0);
        }
        /**
         * Draw a buffer with a special shader that uses an id instead of a color
         * @param _renderShader
         * @param _renderBuffers
         * @param _world
         * @param _projection
         */
        static drawForRayCast(_id, _renderBuffers, _world, _projection) {
            let renderShader = RenderOperator.renderShaderRayCast;
            RenderOperator.useProgram(renderShader);
            RenderOperator.crc3.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, _renderBuffers.vertices);
            RenderOperator.crc3.enableVertexAttribArray(renderShader.attributes["a_position"]);
            RenderOperator.setAttributeStructure(renderShader.attributes["a_position"], FudgeCore.Mesh.getBufferSpecification());
            RenderOperator.crc3.bindBuffer(WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER, _renderBuffers.indices);
            // Supply matrixdata to shader. 
            let uProjection = renderShader.uniforms["u_projection"];
            RenderOperator.crc3.uniformMatrix4fv(uProjection, false, _projection.get());
            if (renderShader.uniforms["u_world"]) {
                let uWorld = renderShader.uniforms["u_world"];
                RenderOperator.crc3.uniformMatrix4fv(uWorld, false, _world.get());
            }
            let idUniformLocation = renderShader.uniforms["u_id"];
            RenderOperator.getRenderingContext().uniform1i(idUniformLocation, _id);
            RenderOperator.crc3.drawElements(WebGL2RenderingContext.TRIANGLES, _renderBuffers.nIndices, WebGL2RenderingContext.UNSIGNED_SHORT, 0);
        }
        // #region Shaderprogram 
        static createProgram(_shaderClass) {
            let crc3 = RenderOperator.crc3;
            let program = crc3.createProgram();
            let renderShader;
            try {
                crc3.attachShader(program, RenderOperator.assert(compileShader(_shaderClass.getVertexShaderSource(), WebGL2RenderingContext.VERTEX_SHADER)));
                crc3.attachShader(program, RenderOperator.assert(compileShader(_shaderClass.getFragmentShaderSource(), WebGL2RenderingContext.FRAGMENT_SHADER)));
                crc3.linkProgram(program);
                let error = RenderOperator.assert(crc3.getProgramInfoLog(program));
                if (error !== "") {
                    throw new Error("Error linking Shader: " + error);
                }
                renderShader = {
                    program: program,
                    attributes: detectAttributes(),
                    uniforms: detectUniforms()
                };
            }
            catch (_error) {
                FudgeCore.Debug.error(_error);
                debugger;
            }
            return renderShader;
            function compileShader(_shaderCode, _shaderType) {
                let webGLShader = crc3.createShader(_shaderType);
                crc3.shaderSource(webGLShader, _shaderCode);
                crc3.compileShader(webGLShader);
                let error = RenderOperator.assert(crc3.getShaderInfoLog(webGLShader));
                if (error !== "") {
                    throw new Error("Error compiling shader: " + error);
                }
                // Check for any compilation errors.
                if (!crc3.getShaderParameter(webGLShader, WebGL2RenderingContext.COMPILE_STATUS)) {
                    alert(crc3.getShaderInfoLog(webGLShader));
                    return null;
                }
                return webGLShader;
            }
            function detectAttributes() {
                let detectedAttributes = {};
                let attributeCount = crc3.getProgramParameter(program, WebGL2RenderingContext.ACTIVE_ATTRIBUTES);
                for (let i = 0; i < attributeCount; i++) {
                    let attributeInfo = RenderOperator.assert(crc3.getActiveAttrib(program, i));
                    if (!attributeInfo) {
                        break;
                    }
                    detectedAttributes[attributeInfo.name] = crc3.getAttribLocation(program, attributeInfo.name);
                }
                return detectedAttributes;
            }
            function detectUniforms() {
                let detectedUniforms = {};
                let uniformCount = crc3.getProgramParameter(program, WebGL2RenderingContext.ACTIVE_UNIFORMS);
                for (let i = 0; i < uniformCount; i++) {
                    let info = RenderOperator.assert(crc3.getActiveUniform(program, i));
                    if (!info) {
                        break;
                    }
                    detectedUniforms[info.name] = RenderOperator.assert(crc3.getUniformLocation(program, info.name));
                }
                return detectedUniforms;
            }
        }
        static useProgram(_shaderInfo) {
            RenderOperator.crc3.useProgram(_shaderInfo.program);
            RenderOperator.crc3.enableVertexAttribArray(_shaderInfo.attributes["a_position"]);
        }
        static deleteProgram(_program) {
            if (_program) {
                RenderOperator.crc3.deleteProgram(_program.program);
                delete _program.attributes;
                delete _program.uniforms;
            }
        }
        // #endregion
        // #region Meshbuffer
        static createBuffers(_mesh) {
            let vertices = RenderOperator.assert(RenderOperator.crc3.createBuffer());
            RenderOperator.crc3.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, vertices);
            RenderOperator.crc3.bufferData(WebGL2RenderingContext.ARRAY_BUFFER, _mesh.vertices, WebGL2RenderingContext.STATIC_DRAW);
            let indices = RenderOperator.assert(RenderOperator.crc3.createBuffer());
            RenderOperator.crc3.bindBuffer(WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER, indices);
            RenderOperator.crc3.bufferData(WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER, _mesh.indices, WebGL2RenderingContext.STATIC_DRAW);
            let textureUVs = RenderOperator.crc3.createBuffer();
            RenderOperator.crc3.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, textureUVs);
            RenderOperator.crc3.bufferData(WebGL2RenderingContext.ARRAY_BUFFER, _mesh.textureUVs, WebGL2RenderingContext.STATIC_DRAW);
            let normalsFace = RenderOperator.assert(RenderOperator.crc3.createBuffer());
            RenderOperator.crc3.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, normalsFace);
            RenderOperator.crc3.bufferData(WebGL2RenderingContext.ARRAY_BUFFER, _mesh.normalsFace, WebGL2RenderingContext.STATIC_DRAW);
            let bufferInfo = {
                vertices: vertices,
                indices: indices,
                nIndices: _mesh.getIndexCount(),
                textureUVs: textureUVs,
                normalsFace: normalsFace
            };
            return bufferInfo;
        }
        static useBuffers(_renderBuffers) {
            // TODO: currently unused, done specifically in draw. Could be saved in VAO within RenderBuffers
            // RenderOperator.crc3.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, _renderBuffers.vertices);
            // RenderOperator.crc3.bindBuffer(WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER, _renderBuffers.indices);
            // RenderOperator.crc3.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, _renderBuffers.textureUVs);
        }
        static deleteBuffers(_renderBuffers) {
            if (_renderBuffers) {
                RenderOperator.crc3.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, null);
                RenderOperator.crc3.deleteBuffer(_renderBuffers.vertices);
                RenderOperator.crc3.deleteBuffer(_renderBuffers.textureUVs);
                RenderOperator.crc3.bindBuffer(WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER, null);
                RenderOperator.crc3.deleteBuffer(_renderBuffers.indices);
            }
        }
        // #endregion
        // #region MaterialParameters
        static createParameter(_coat) {
            // let vao: WebGLVertexArrayObject = RenderOperator.assert<WebGLVertexArrayObject>(RenderOperator.crc3.createVertexArray());
            let coatInfo = {
                //vao: null,
                coat: _coat
            };
            return coatInfo;
        }
        static useParameter(_coatInfo) {
            // RenderOperator.crc3.bindVertexArray(_coatInfo.vao);
        }
        static deleteParameter(_coatInfo) {
            if (_coatInfo) {
                RenderOperator.crc3.bindVertexArray(null);
                // RenderOperator.crc3.deleteVertexArray(_coatInfo.vao);
            }
        }
        // #endregion
        /**
         * Wrapper function to utilize the bufferSpecification interface when passing data to the shader via a buffer.
         * @param _attributeLocation // The location of the attribute on the shader, to which they data will be passed.
         * @param _bufferSpecification // Interface passing datapullspecifications to the buffer.
         */
        static setAttributeStructure(_attributeLocation, _bufferSpecification) {
            RenderOperator.crc3.vertexAttribPointer(_attributeLocation, _bufferSpecification.size, _bufferSpecification.dataType, _bufferSpecification.normalize, _bufferSpecification.stride, _bufferSpecification.offset);
        }
    }
    FudgeCore.RenderOperator = RenderOperator;
})(FudgeCore || (FudgeCore = {}));
/// <reference path="../Transfer/Mutable.ts"/>
/// <reference path="../Render/RenderInjector.ts"/>
/// <reference path="../Render/RenderOperator.ts"/>
var FudgeCore;
/// <reference path="../Transfer/Mutable.ts"/>
/// <reference path="../Render/RenderInjector.ts"/>
/// <reference path="../Render/RenderOperator.ts"/>
(function (FudgeCore) {
    /**
     * Holds data to feed into a [[Shader]] to describe the surface of [[Mesh]].
     * [[Material]]s reference [[Coat]] and [[Shader]].
     * The method useRenderData will be injected by [[RenderInjector]] at runtime, extending the functionality of this class to deal with the renderer.
     */
    class Coat extends FudgeCore.Mutable {
        constructor() {
            super(...arguments);
            this.name = "Coat";
            //#endregion
        }
        mutate(_mutator) {
            super.mutate(_mutator);
        }
        useRenderData(_renderShader) { }
        //#region Transfer
        serialize() {
            let serialization = this.getMutator();
            return serialization;
        }
        deserialize(_serialization) {
            this.mutate(_serialization);
            return this;
        }
        reduceMutator() { }
    }
    FudgeCore.Coat = Coat;
    /**
     * The simplest [[Coat]] providing just a color
     */
    let CoatColored = class CoatColored extends Coat {
        constructor(_color) {
            super();
            this.color = _color || new FudgeCore.Color(0.5, 0.5, 0.5, 1);
        }
    };
    CoatColored = __decorate([
        FudgeCore.RenderInjector.decorateCoat
    ], CoatColored);
    FudgeCore.CoatColored = CoatColored;
    /**
     * A [[Coat]] providing a texture and additional data for texturing
     */
    let CoatTextured = class CoatTextured extends Coat {
        /**
         * A [[Coat]] providing a texture and additional data for texturing
         */
        constructor() {
            super(...arguments);
            this.texture = null;
        }
    };
    CoatTextured = __decorate([
        FudgeCore.RenderInjector.decorateCoat
    ], CoatTextured);
    FudgeCore.CoatTextured = CoatTextured;
    /**
     * A [[Coat]] to be used by the MatCap Shader providing a texture, a tint color (0.5 grey is neutral)
     * and a flatMix number for mixing between smooth and flat shading.
     */
    let CoatMatCap = class CoatMatCap extends Coat {
        constructor(_texture, _tintcolor, _flatmix) {
            super();
            this.texture = null;
            this.tintColor = new FudgeCore.Color(0.5, 0.5, 0.5, 1);
            this.flatMix = 0.5;
            this.texture = _texture || new FudgeCore.TextureImage();
            this.tintColor = _tintcolor || new FudgeCore.Color(0.5, 0.5, 0.5, 1);
            this.flatMix = _flatmix > 1.0 ? this.flatMix = 1.0 : this.flatMix = _flatmix || 0.5;
        }
    };
    CoatMatCap = __decorate([
        FudgeCore.RenderInjector.decorateCoat
    ], CoatMatCap);
    FudgeCore.CoatMatCap = CoatMatCap;
})(FudgeCore || (FudgeCore = {}));
/// <reference path="../Transfer/Serializer.ts"/>
/// <reference path="../Transfer/Mutable.ts"/>
var FudgeCore;
/// <reference path="../Transfer/Serializer.ts"/>
/// <reference path="../Transfer/Mutable.ts"/>
(function (FudgeCore) {
    /**
     * Superclass for all [[Component]]s that can be attached to [[Node]]s.
     * @authors Jascha Karagöl, HFU, 2019 | Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class Component extends FudgeCore.Mutable {
        constructor() {
            super(...arguments);
            this.singleton = true;
            this.container = null;
            this.active = true;
            //#endregion
        }
        activate(_on) {
            this.active = _on;
            this.dispatchEvent(new Event(_on ? "componentActivate" /* COMPONENT_ACTIVATE */ : "componentDeactivate" /* COMPONENT_DEACTIVATE */));
        }
        get isActive() {
            return this.active;
        }
        /**
         * Is true, when only one instance of the component class can be attached to a node
         */
        get isSingleton() {
            return this.singleton;
        }
        /**
         * Retrieves the node, this component is currently attached to
         * @returns The container node or null, if the component is not attached to
         */
        getContainer() {
            return this.container;
        }
        /**
         * Tries to add the component to the given node, removing it from the previous container if applicable
         * @param _container The node to attach this component to
         */
        setContainer(_container) {
            if (this.container == _container)
                return;
            let previousContainer = this.container;
            try {
                if (previousContainer)
                    previousContainer.removeComponent(this);
                this.container = _container;
                if (this.container)
                    this.container.addComponent(this);
            }
            catch {
                this.container = previousContainer;
            }
        }
        //#region Transfer
        serialize() {
            let serialization = {
                active: this.active
            };
            return serialization;
        }
        deserialize(_serialization) {
            this.active = _serialization.active;
            return this;
        }
        reduceMutator(_mutator) {
            delete _mutator.singleton;
            delete _mutator.container;
        }
    }
    FudgeCore.Component = Component;
})(FudgeCore || (FudgeCore = {}));
/// <reference path="Component.ts"/>
var FudgeCore;
/// <reference path="Component.ts"/>
(function (FudgeCore) {
    /**
     * Holds different playmodes the animation uses to play back its animation.
     * @author Lukas Scheuerle, HFU, 2019
     */
    let ANIMATION_PLAYMODE;
    (function (ANIMATION_PLAYMODE) {
        /**Plays animation in a loop: it restarts once it hit the end.*/
        ANIMATION_PLAYMODE[ANIMATION_PLAYMODE["LOOP"] = 0] = "LOOP";
        /**Plays animation once and stops at the last key/frame*/
        ANIMATION_PLAYMODE[ANIMATION_PLAYMODE["PLAYONCE"] = 1] = "PLAYONCE";
        /**Plays animation once and stops on the first key/frame */
        ANIMATION_PLAYMODE[ANIMATION_PLAYMODE["PLAYONCESTOPAFTER"] = 2] = "PLAYONCESTOPAFTER";
        /**Plays animation like LOOP, but backwards.*/
        ANIMATION_PLAYMODE[ANIMATION_PLAYMODE["REVERSELOOP"] = 3] = "REVERSELOOP";
        /**Causes the animation not to play at all. Useful for jumping to various positions in the animation without proceeding in the animation.*/
        ANIMATION_PLAYMODE[ANIMATION_PLAYMODE["STOP"] = 4] = "STOP";
        //TODO: add an INHERIT and a PINGPONG mode
    })(ANIMATION_PLAYMODE = FudgeCore.ANIMATION_PLAYMODE || (FudgeCore.ANIMATION_PLAYMODE = {}));
    let ANIMATION_PLAYBACK;
    (function (ANIMATION_PLAYBACK) {
        //TODO: add an in-depth description of what happens to the animation (and events) depending on the Playback. Use Graphs to explain.
        /**Calculates the state of the animation at the exact position of time. Ignores FPS value of animation.*/
        ANIMATION_PLAYBACK[ANIMATION_PLAYBACK["TIMEBASED_CONTINOUS"] = 0] = "TIMEBASED_CONTINOUS";
        /**Limits the calculation of the state of the animation to the FPS value of the animation. Skips frames if needed.*/
        ANIMATION_PLAYBACK[ANIMATION_PLAYBACK["TIMEBASED_RASTERED_TO_FPS"] = 1] = "TIMEBASED_RASTERED_TO_FPS";
        /**Uses the FPS value of the animation to advance once per frame, no matter the speed of the frames. Doesn't skip any frames.*/
        ANIMATION_PLAYBACK[ANIMATION_PLAYBACK["FRAMEBASED"] = 2] = "FRAMEBASED";
    })(ANIMATION_PLAYBACK = FudgeCore.ANIMATION_PLAYBACK || (FudgeCore.ANIMATION_PLAYBACK = {}));
    /**
     * Holds a reference to an [[Animation]] and controls it. Controls playback and playmode as well as speed.
     * @authors Lukas Scheuerle, HFU, 2019
     */
    class ComponentAnimator extends FudgeCore.Component {
        constructor(_animation = new FudgeCore.Animation(""), _playmode = ANIMATION_PLAYMODE.LOOP, _playback = ANIMATION_PLAYBACK.TIMEBASED_CONTINOUS) {
            super();
            this.speedScalesWithGlobalSpeed = true;
            this.speedScale = 1;
            this.lastTime = 0;
            this.animation = _animation;
            this.playmode = _playmode;
            this.playback = _playback;
            this.localTime = new FudgeCore.Time();
            //TODO: update animation total time when loading a different animation?
            this.animation.calculateTotalTime();
            FudgeCore.Loop.addEventListener("loopFrame" /* LOOP_FRAME */, this.updateAnimationLoop.bind(this));
            FudgeCore.Time.game.addEventListener("timeScaled" /* TIME_SCALED */, this.updateScale.bind(this));
        }
        set speed(_s) {
            this.speedScale = _s;
            this.updateScale();
        }
        /**
         * Jumps to a certain time in the animation to play from there.
         * @param _time The time to jump to
         */
        jumpTo(_time) {
            this.localTime.set(_time);
            this.lastTime = _time;
            _time = _time % this.animation.totalTime;
            let mutator = this.animation.getMutated(_time, this.calculateDirection(_time), this.playback);
            this.getContainer().applyAnimation(mutator);
        }
        /**
         * Returns the current time of the animation, modulated for animation length.
         */
        getCurrentTime() {
            return this.localTime.get() % this.animation.totalTime;
        }
        /**
         * Forces an update of the animation from outside. Used in the ViewAnimation. Shouldn't be used during the game.
         * @param _time the (unscaled) time to update the animation with.
         * @returns a Tupel containing the Mutator for Animation and the playmode corrected time.
         */
        updateAnimation(_time) {
            return this.updateAnimationLoop(null, _time);
        }
        //#region transfer
        serialize() {
            let s = super.serialize();
            s["animation"] = this.animation.serialize();
            s["playmode"] = this.playmode;
            s["playback"] = this.playback;
            s["speedScale"] = this.speedScale;
            s["speedScalesWithGlobalSpeed"] = this.speedScalesWithGlobalSpeed;
            s[super.constructor.name] = super.serialize();
            return s;
        }
        deserialize(_s) {
            this.animation = new FudgeCore.Animation("");
            this.animation.deserialize(_s.animation);
            this.playback = _s.playback;
            this.playmode = _s.playmode;
            this.speedScale = _s.speedScale;
            this.speedScalesWithGlobalSpeed = _s.speedScalesWithGlobalSpeed;
            super.deserialize(_s[super.constructor.name]);
            return this;
        }
        //#endregion
        //#region updateAnimation
        /**
         * Updates the Animation.
         * Gets called every time the Loop fires the LOOP_FRAME Event.
         * Uses the built-in time unless a different time is specified.
         * May also be called from updateAnimation().
         */
        updateAnimationLoop(_e, _time) {
            if (this.animation.totalTime == 0)
                return [null, 0];
            let time = _time || this.localTime.get();
            if (this.playback == ANIMATION_PLAYBACK.FRAMEBASED) {
                time = this.lastTime + (1000 / this.animation.fps);
            }
            let direction = this.calculateDirection(time);
            time = this.applyPlaymodes(time);
            this.executeEvents(this.animation.getEventsToFire(this.lastTime, time, this.playback, direction));
            if (this.lastTime != time) {
                this.lastTime = time;
                time = time % this.animation.totalTime;
                let mutator = this.animation.getMutated(time, direction, this.playback);
                if (this.getContainer()) {
                    this.getContainer().applyAnimation(mutator);
                }
                return [mutator, time];
            }
            return [null, time];
        }
        /**
         * Fires all custom events the Animation should have fired between the last frame and the current frame.
         * @param events a list of names of custom events to fire
         */
        executeEvents(events) {
            for (let i = 0; i < events.length; i++) {
                this.dispatchEvent(new Event(events[i]));
            }
        }
        /**
         * Calculates the actual time to use, using the current playmodes.
         * @param _time the time to apply the playmodes to
         * @returns the recalculated time
         */
        applyPlaymodes(_time) {
            switch (this.playmode) {
                case ANIMATION_PLAYMODE.STOP:
                    return this.localTime.getOffset();
                case ANIMATION_PLAYMODE.PLAYONCE:
                    if (_time >= this.animation.totalTime)
                        return this.animation.totalTime - 0.01; //TODO: this might cause some issues
                    else
                        return _time;
                case ANIMATION_PLAYMODE.PLAYONCESTOPAFTER:
                    if (_time >= this.animation.totalTime)
                        return this.animation.totalTime + 0.01; //TODO: this might cause some issues
                    else
                        return _time;
                default:
                    return _time;
            }
        }
        /**
         * Calculates and returns the direction the animation should currently be playing in.
         * @param _time the time at which to calculate the direction
         * @returns 1 if forward, 0 if stop, -1 if backwards
         */
        calculateDirection(_time) {
            switch (this.playmode) {
                case ANIMATION_PLAYMODE.STOP:
                    return 0;
                // case ANIMATION_PLAYMODE.PINGPONG:
                //   if (Math.floor(_time / this.animation.totalTime) % 2 == 0)
                //     return 1;
                //   else
                //     return -1;
                case ANIMATION_PLAYMODE.REVERSELOOP:
                    return -1;
                case ANIMATION_PLAYMODE.PLAYONCE:
                case ANIMATION_PLAYMODE.PLAYONCESTOPAFTER:
                    if (_time >= this.animation.totalTime) {
                        return 0;
                    }
                default:
                    return 1;
            }
        }
        /**
         * Updates the scale of the animation if the user changes it or if the global game timer changed its scale.
         */
        updateScale() {
            let newScale = this.speedScale;
            if (this.speedScalesWithGlobalSpeed)
                newScale *= FudgeCore.Time.game.getScale();
            this.localTime.setScale(newScale);
        }
    }
    FudgeCore.ComponentAnimator = ComponentAnimator;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Attaches a [[ComponentAudio]] to a [[Node]].
     * Only a single [[Audio]] can be used within a single [[ComponentAudio]]
     * @authors Thomas Dorner, HFU, 2019
     */
    class ComponentAudio extends FudgeCore.Component {
        /**
         * Create Component Audio for
         * @param _audio
         */
        constructor(_audio, _audioOscillator) {
            super();
            this.isLocalised = false;
            this.isFiltered = false;
            this.isDelayed = false;
            this.singleton = false;
            if (_audio) {
                this.setAudio(_audio);
            }
        }
        /**
         * set AudioFilter in ComponentAudio
         * @param _filter AudioFilter
         */
        setFilter(_filter) {
            this.filter = _filter;
            this.isFiltered = true;
        }
        getFilter() {
            return this.filter;
        }
        setDelay(_delay) {
            this.delay = _delay;
            this.isDelayed = true;
        }
        getDelay() {
            return this.delay;
        }
        setLocalisation(_localisation) {
            this.localisation = _localisation;
            this.isLocalised = true;
        }
        getLocalisation() {
            return this.localisation;
        }
        /**
         * Play Audio at current time of AudioContext
         */
        playAudio(_audioSettings, _offset, _duration) {
            this.audio.initBufferSource(_audioSettings);
            this.connectAudioNodes(_audioSettings);
            this.audio.getBufferSourceNode().start(_audioSettings.getAudioContext().currentTime, _offset, _duration);
        }
        /**
         * Adds an [[Audio]] to the [[ComponentAudio]]
         * @param _audio Audio Data as [[Audio]]
         */
        setAudio(_audio) {
            this.audio = _audio;
        }
        getAudio() {
            return this.audio;
        }
        //#region Transfer
        serialize() {
            let serialization = {
                isFiltered: this.isFiltered,
                isDelayed: this.isDelayed,
                isLocalised: this.isLocalised,
                audio: this.audio,
                filter: this.filter,
                delay: this.delay,
                localisation: this.localisation
            };
            return serialization;
        }
        deserialize(_serialization) {
            this.isFiltered = _serialization.isFiltered;
            this.isDelayed = _serialization.isDelayed;
            this.isLocalised = _serialization.isLocalised;
            this.audio = _serialization.audio;
            this.filter = _serialization.filter;
            this.delay = _serialization.delay;
            return this;
        }
        reduceMutator(_mutator) {
            delete this.audio;
            delete this.filter;
            delete this.delay;
            delete this.localisation;
        }
        //#endregion
        /**
         * Final attachments for the Audio Nodes in following order.
         * This method needs to be called whenever there is a change of parts in the [[ComponentAudio]].
         * 1. Local Gain
         * 2. Localisation
         * 3. Filter
         * 4. Delay
         * 5. Master Gain
         */
        connectAudioNodes(_audioSettings) {
            const bufferSource = this.audio.getBufferSourceNode();
            const lGain = this.audio.getLocalGain();
            let panner;
            let filt;
            let delay;
            const mGain = _audioSettings.masterGain;
            console.log("-------------------------------");
            console.log("Connecting Properties for Audio");
            console.log("-------------------------------");
            bufferSource.connect(lGain);
            if (this.isLocalised && this.localisation != null) {
                console.log("Connect Localisation");
                panner = this.localisation.pannerNode;
                lGain.connect(panner);
                if (this.isFiltered && this.filter != null) {
                    console.log("Connect Filter");
                    filt = this.filter.audioFilter;
                    panner.connect(filt);
                    if (this.isDelayed && this.delay != null) {
                        console.log("Connect Delay");
                        delay = this.delay.audioDelay;
                        filt.connect(delay);
                        console.log("Connect Master Gain");
                        delay.connect(mGain);
                    }
                    else {
                        console.log("Connect Master Gain");
                        filt.connect(mGain);
                    }
                }
                else {
                    if (this.isDelayed && this.delay != null) {
                        console.log("Connect Delay");
                        delay = this.delay.audioDelay;
                        panner.connect(delay);
                        console.log("Connect Master Gain");
                        delay.connect(mGain);
                    }
                    else {
                        console.log("Connect Master Gain");
                        panner.connect(mGain);
                    }
                }
            }
            else if (this.isFiltered && this.filter != null) {
                console.log("Connect Filter");
                filt = this.filter.audioFilter;
                lGain.connect(filt);
                if (this.isDelayed && this.delay != null) {
                    console.log("Connect Delay");
                    delay = this.delay.audioDelay;
                    filt.connect(delay);
                    console.log("Connect Master Gain");
                    delay.connect(mGain);
                }
                else {
                    console.log("Connect Master Gain");
                    filt.connect(mGain);
                }
            }
            else if (this.isDelayed && this.delay != null) {
                console.log("Connect Delay");
                delay = this.delay.audioDelay;
                lGain.connect(delay);
                console.log("Connect Master Gain");
                delay.connect(mGain);
            }
            else {
                console.log("Connect Only Master Gain");
                lGain.connect(mGain);
            }
            console.log("-------------------------------");
        }
    }
    FudgeCore.ComponentAudio = ComponentAudio;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Attaches an [[AudioListener]] to the node
     * @authors Thomas Dorner, HFU, 2019
     */
    class ComponentAudioListener extends FudgeCore.Component {
        /**
         * Constructor of the AudioListener class
         * @param _audioContext Audio Context from AudioSessionData
         */
        constructor(_audioSettings) {
            super();
            this.audioListener = _audioSettings.getAudioContext().listener;
        }
        setAudioListener(_audioSettings) {
            this.audioListener = _audioSettings.getAudioContext().listener;
        }
        getAudioListener() {
            return this.audioListener;
        }
        /**
         * We will call setAudioListenerPosition whenever there is a need to change Positions.
         * All the position values should be identical to the current Position this is attached to.
         *
         *     __|___
         *    |  |  |
         *    |  °--|--
         *    |/____|
         *   /
         *
         */
        setListenerPosition(_position) {
            this.positionBase = _position;
            this.audioListener.positionX.value = this.positionBase.x;
            this.audioListener.positionY.value = -this.positionBase.z;
            this.audioListener.positionZ.value = this.positionBase.y;
            console.log("Set Listener Position: X: " + this.audioListener.positionX.value + " | Y: " + this.audioListener.positionY.value + " | Z: " + this.audioListener.positionZ.value);
        }
        getListenerPosition() {
            return this.positionBase;
        }
        /**
         * FUDGE SYSTEM
         *
         *      UP (Y)
         *       ^
         *     __|___
         *    |  |  |
         *    |  O--|--> FORWARD (Z)
         *    |_____|
         */
        setListenerPositionForward(_position) {
            this.positionFW = _position;
            //Set forward looking position of the AudioListener
            this.audioListener.forwardX.value = this.positionFW.x;
            this.audioListener.forwardY.value = -this.positionFW.z + 1;
            this.audioListener.forwardZ.value = this.positionFW.y;
        }
        getListenerPositionForward() {
            return this.positionFW;
        }
        /**
         *      UP (Z)
         *       ^
         *     __|___
         *    |  |  |
         *    |  O--|--> FORWARD (X)
         *    |_____|
         */
        setListenerPostitionUp(_position) {
            this.positionUP = _position;
            //Set upward looking position of the AudioListener
            this.audioListener.upX.value = this.positionUP.x;
            this.audioListener.upY.value = -this.positionUP.z;
            this.audioListener.upZ.value = this.positionUP.y + 1;
        }
        getListenerPositionUp() {
            return this.positionUP;
        }
        /**
         * Set all positional Values based on a single Position
         * @param _position position of the Object
         */
        updatePositions(_position /*, _positionForward: Vector3, _positionUp: Vector3*/) {
            this.setListenerPosition(_position);
            this.setListenerPositionForward(_position);
            this.setListenerPostitionUp(_position);
        }
        /**
         * Show all Settings inside of [[ComponentAudioListener]].
         * Method only for Debugging Purposes.
         */
        showListenerSettings() {
            console.log("------------------------------");
            console.log("Show all Settings of Listener");
            console.log("------------------------------");
            console.log("Listener Position Base: X: " + this.audioListener.positionX.value + " | Y: " + this.audioListener.positionY.value + " | Z: " + this.audioListener.positionZ.value);
            console.log("Listener Position Up: X: " + this.audioListener.upX.value + " | Y: " + this.audioListener.upY.value + " | Z: " + this.audioListener.upZ.value);
            console.log("Listener Position Forward: X: " + this.audioListener.forwardX.value + " | Y: " + this.audioListener.forwardY.value + " | Z: " + this.audioListener.forwardZ.value);
            console.log("------------------------------");
        }
        //#region Transfer
        serialize() {
            let serialization = {
                audioListener: this.audioListener,
                posBase: this.positionBase,
                posFW: this.positionFW,
                posUP: this.positionUP
            };
            return serialization;
        }
        deserialize(_serialization) {
            this.audioListener = _serialization.audioListener;
            this.positionBase = _serialization.posBase;
            this.positionFW = _serialization.posFW;
            this.positionUP = _serialization.posUP;
            return this;
        }
        reduceMutator(_mutator) {
            delete this.audioListener;
            delete this.positionBase;
            delete this.positionFW;
            delete this.positionUP;
        }
    }
    FudgeCore.ComponentAudioListener = ComponentAudioListener;
})(FudgeCore || (FudgeCore = {}));
/// <reference path="Component.ts"/>
var FudgeCore;
/// <reference path="Component.ts"/>
(function (FudgeCore) {
    let FIELD_OF_VIEW;
    (function (FIELD_OF_VIEW) {
        FIELD_OF_VIEW[FIELD_OF_VIEW["HORIZONTAL"] = 0] = "HORIZONTAL";
        FIELD_OF_VIEW[FIELD_OF_VIEW["VERTICAL"] = 1] = "VERTICAL";
        FIELD_OF_VIEW[FIELD_OF_VIEW["DIAGONAL"] = 2] = "DIAGONAL";
    })(FIELD_OF_VIEW = FudgeCore.FIELD_OF_VIEW || (FudgeCore.FIELD_OF_VIEW = {}));
    /**
     * Defines identifiers for the various projections a camera can provide.
     * TODO: change back to number enum if strings not needed
     */
    let PROJECTION;
    (function (PROJECTION) {
        PROJECTION["CENTRAL"] = "central";
        PROJECTION["ORTHOGRAPHIC"] = "orthographic";
        PROJECTION["DIMETRIC"] = "dimetric";
        PROJECTION["STEREO"] = "stereo";
    })(PROJECTION = FudgeCore.PROJECTION || (FudgeCore.PROJECTION = {}));
    /**
     * The camera component holds the projection-matrix and other data needed to render a scene from the perspective of the node it is attached to.
     * @authors Jascha Karagöl, HFU, 2019 | Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class ComponentCamera extends FudgeCore.Component {
        constructor() {
            super(...arguments);
            this.pivot = FudgeCore.Matrix4x4.IDENTITY;
            //private orthographic: boolean = false; // Determines whether the image will be rendered with perspective or orthographic projection.
            this.projection = PROJECTION.CENTRAL;
            this.transform = new FudgeCore.Matrix4x4; // The matrix to multiply each scene objects transformation by, to determine where it will be drawn.
            this.fieldOfView = 45; // The camera's sensorangle.
            this.aspectRatio = 1.0;
            this.direction = FIELD_OF_VIEW.DIAGONAL;
            this.backgroundColor = new FudgeCore.Color(0, 0, 0, 1); // The color of the background the camera will render.
            this.backgroundEnabled = true; // Determines whether or not the background of this camera will be rendered.
            //#endregion
        }
        // TODO: examine, if background should be an attribute of Camera or Viewport
        getProjection() {
            return this.projection;
        }
        getBackgoundColor() {
            return this.backgroundColor;
        }
        getBackgroundEnabled() {
            return this.backgroundEnabled;
        }
        getAspect() {
            return this.aspectRatio;
        }
        getFieldOfView() {
            return this.fieldOfView;
        }
        getDirection() {
            return this.direction;
        }
        /**
         * Returns the multiplikation of the worldtransformation of the camera container with the projection matrix
         * @returns the world-projection-matrix
         */
        get ViewProjectionMatrix() {
            let world = this.pivot;
            try {
                world = FudgeCore.Matrix4x4.MULTIPLICATION(this.getContainer().mtxWorld, this.pivot);
            }
            catch (_error) {
                // no container node or no world transformation found -> continue with pivot only
            }
            let viewMatrix = FudgeCore.Matrix4x4.INVERSION(world);
            return FudgeCore.Matrix4x4.MULTIPLICATION(this.transform, viewMatrix);
        }
        /**
         * Set the camera to perspective projection. The world origin is in the center of the canvaselement.
         * @param _aspect The aspect ratio between width and height of projectionspace.(Default = canvas.clientWidth / canvas.ClientHeight)
         * @param _fieldOfView The field of view in Degrees. (Default = 45)
         * @param _direction The plane on which the fieldOfView-Angle is given
         */
        projectCentral(_aspect = this.aspectRatio, _fieldOfView = this.fieldOfView, _direction = this.direction) {
            this.aspectRatio = _aspect;
            this.fieldOfView = _fieldOfView;
            this.direction = _direction;
            this.projection = PROJECTION.CENTRAL;
            this.transform = FudgeCore.Matrix4x4.PROJECTION_CENTRAL(_aspect, this.fieldOfView, 1, 2000, this.direction); // TODO: remove magic numbers
        }
        /**
         * Set the camera to orthographic projection. The origin is in the top left corner of the canvas.
         * @param _left The positionvalue of the projectionspace's left border. (Default = 0)
         * @param _right The positionvalue of the projectionspace's right border. (Default = canvas.clientWidth)
         * @param _bottom The positionvalue of the projectionspace's bottom border.(Default = canvas.clientHeight)
         * @param _top The positionvalue of the projectionspace's top border.(Default = 0)
         */
        projectOrthographic(_left = 0, _right = FudgeCore.RenderManager.getCanvas().clientWidth, _bottom = FudgeCore.RenderManager.getCanvas().clientHeight, _top = 0) {
            this.projection = PROJECTION.ORTHOGRAPHIC;
            this.transform = FudgeCore.Matrix4x4.PROJECTION_ORTHOGRAPHIC(_left, _right, _bottom, _top, 400, -400); // TODO: examine magic numbers!
        }
        /**
         * Return the calculated normed dimension of the projection space
         */
        getProjectionRectangle() {
            let tanFov = Math.tan(Math.PI * this.fieldOfView / 360); // Half of the angle, to calculate dimension from the center -> right angle
            let tanHorizontal = 0;
            let tanVertical = 0;
            if (this.direction == FIELD_OF_VIEW.DIAGONAL) {
                let aspect = Math.sqrt(this.aspectRatio);
                tanHorizontal = tanFov * aspect;
                tanVertical = tanFov / aspect;
            }
            else if (this.direction == FIELD_OF_VIEW.VERTICAL) {
                tanVertical = tanFov;
                tanHorizontal = tanVertical * this.aspectRatio;
            }
            else { //FOV_DIRECTION.HORIZONTAL
                tanHorizontal = tanFov;
                tanVertical = tanHorizontal / this.aspectRatio;
            }
            return FudgeCore.Rectangle.GET(0, 0, tanHorizontal * 2, tanVertical * 2);
        }
        //#region Transfer
        serialize() {
            let serialization = {
                backgroundColor: this.backgroundColor,
                backgroundEnabled: this.backgroundEnabled,
                projection: this.projection,
                fieldOfView: this.fieldOfView,
                direction: this.direction,
                aspect: this.aspectRatio,
                pivot: this.pivot.serialize(),
                [super.constructor.name]: super.serialize()
            };
            return serialization;
        }
        deserialize(_serialization) {
            this.backgroundColor = _serialization.backgroundColor;
            this.backgroundEnabled = _serialization.backgroundEnabled;
            this.projection = _serialization.projection;
            this.fieldOfView = _serialization.fieldOfView;
            this.aspectRatio = _serialization.aspect;
            this.direction = _serialization.direction;
            this.pivot.deserialize(_serialization.pivot);
            super.deserialize(_serialization[super.constructor.name]);
            switch (this.projection) {
                case PROJECTION.ORTHOGRAPHIC:
                    this.projectOrthographic(); // TODO: serialize and deserialize parameters
                    break;
                case PROJECTION.CENTRAL:
                    this.projectCentral();
                    break;
            }
            return this;
        }
        getMutatorAttributeTypes(_mutator) {
            let types = super.getMutatorAttributeTypes(_mutator);
            if (types.direction)
                types.direction = FIELD_OF_VIEW;
            if (types.projection)
                types.projection = PROJECTION;
            return types;
        }
        mutate(_mutator) {
            super.mutate(_mutator);
            switch (this.projection) {
                case PROJECTION.CENTRAL:
                    this.projectCentral(this.aspectRatio, this.fieldOfView, this.direction);
                    break;
            }
        }
        reduceMutator(_mutator) {
            delete _mutator.transform;
            super.reduceMutator(_mutator);
        }
    }
    FudgeCore.ComponentCamera = ComponentCamera;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Baseclass for different kinds of lights.
     * @authors Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class Light extends FudgeCore.Mutable {
        constructor(_color = new FudgeCore.Color(1, 1, 1, 1)) {
            super();
            this.color = _color;
        }
        reduceMutator() { }
    }
    FudgeCore.Light = Light;
    /**
     * Ambient light, coming from all directions, illuminating everything with its color independent of position and orientation (like a foggy day or in the shades)
     * ```plaintext
     * ~ ~ ~
     *  ~ ~ ~
     * ```
     */
    class LightAmbient extends Light {
        constructor(_color = new FudgeCore.Color(1, 1, 1, 1)) {
            super(_color);
        }
    }
    FudgeCore.LightAmbient = LightAmbient;
    /**
     * Directional light, illuminating everything from a specified direction with its color (like standing in bright sunlight)
     * ```plaintext
     * --->
     * --->
     * --->
     * ```
     */
    class LightDirectional extends Light {
        constructor(_color = new FudgeCore.Color(1, 1, 1, 1)) {
            super(_color);
        }
    }
    FudgeCore.LightDirectional = LightDirectional;
    /**
     * Omnidirectional light emitting from its position, illuminating objects depending on their position and distance with its color (like a colored light bulb)
     * ```plaintext
     *         .\|/.
     *        -- o --
     *         ´/|\`
     * ```
     */
    class LightPoint extends Light {
        constructor() {
            super(...arguments);
            this.range = 10;
        }
    }
    FudgeCore.LightPoint = LightPoint;
    /**
     * Spot light emitting within a specified angle from its position, illuminating objects depending on their position and distance with its color
     * ```plaintext
     *          o
     *         /|\
     *        / | \
     * ```
     */
    class LightSpot extends Light {
    }
    FudgeCore.LightSpot = LightSpot;
})(FudgeCore || (FudgeCore = {}));
///<reference path="../Light/Light.ts"/>
var FudgeCore;
///<reference path="../Light/Light.ts"/>
(function (FudgeCore) {
    /**
     * Attaches a [[Light]] to the node
     * @authors Jirka Dell'Oro-Friedl, HFU, 2019
     */
    /**
     * Defines identifiers for the various types of light this component can provide.
     */
    // export enum LIGHT_TYPE {
    //     AMBIENT = "ambient",
    //     DIRECTIONAL = "directional",
    //     POINT = "point",
    //     SPOT = "spot"
    // }
    class ComponentLight extends FudgeCore.Component {
        constructor(_light = new FudgeCore.LightAmbient()) {
            super();
            // private static constructors: { [type: string]: General } = { [LIGHT_TYPE.AMBIENT]: LightAmbient, [LIGHT_TYPE.DIRECTIONAL]: LightDirectional, [LIGHT_TYPE.POINT]: LightPoint, [LIGHT_TYPE.SPOT]: LightSpot };
            this.pivot = FudgeCore.Matrix4x4.IDENTITY;
            this.light = null;
            this.singleton = false;
            this.light = _light;
        }
        setType(_class) {
            let mtrOld = {};
            if (this.light)
                mtrOld = this.light.getMutator();
            this.light = new _class();
            this.light.mutate(mtrOld);
        }
    }
    FudgeCore.ComponentLight = ComponentLight;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Attaches a [[Material]] to the node
     * @authors Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class ComponentMaterial extends FudgeCore.Component {
        constructor(_material = null) {
            super();
            this.material = _material;
        }
        //#region Transfer
        serialize() {
            let serialization;
            /* at this point of time, serialization as resource and as inline object is possible. TODO: check if inline becomes obsolete */
            let idMaterial = this.material.idResource;
            if (idMaterial)
                serialization = { idMaterial: idMaterial };
            else
                serialization = { material: FudgeCore.Serializer.serialize(this.material) };
            serialization[super.constructor.name] = super.serialize();
            return serialization;
        }
        deserialize(_serialization) {
            let material;
            if (_serialization.idMaterial)
                material = FudgeCore.ResourceManager.get(_serialization.idMaterial);
            else
                material = FudgeCore.Serializer.deserialize(_serialization.material);
            this.material = material;
            super.deserialize(_serialization[super.constructor.name]);
            return this;
        }
    }
    FudgeCore.ComponentMaterial = ComponentMaterial;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Attaches a [[Mesh]] to the node
     * @authors Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class ComponentMesh extends FudgeCore.Component {
        constructor(_mesh = null) {
            super();
            this.pivot = FudgeCore.Matrix4x4.IDENTITY;
            this.mesh = null;
            this.mesh = _mesh;
        }
        //#region Transfer
        serialize() {
            let serialization;
            /* at this point of time, serialization as resource and as inline object is possible. TODO: check if inline becomes obsolete */
            let idMesh = this.mesh.idResource;
            if (idMesh)
                serialization = { idMesh: idMesh };
            else
                serialization = { mesh: FudgeCore.Serializer.serialize(this.mesh) };
            serialization.pivot = this.pivot.serialize();
            serialization[super.constructor.name] = super.serialize();
            return serialization;
        }
        deserialize(_serialization) {
            let mesh;
            if (_serialization.idMesh)
                mesh = FudgeCore.ResourceManager.get(_serialization.idMesh);
            else
                mesh = FudgeCore.Serializer.deserialize(_serialization.mesh);
            this.mesh = mesh;
            this.pivot.deserialize(_serialization.pivot);
            super.deserialize(_serialization[super.constructor.name]);
            return this;
        }
    }
    FudgeCore.ComponentMesh = ComponentMesh;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Base class for scripts the user writes
     * @authors Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class ComponentScript extends FudgeCore.Component {
        constructor() {
            super();
            this.singleton = false;
        }
        serialize() {
            return this.getMutator();
        }
        deserialize(_serialization) {
            this.mutate(_serialization);
            return this;
        }
    }
    FudgeCore.ComponentScript = ComponentScript;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Attaches a transform-[[Matrix4x4]] to the node, moving, scaling and rotating it in space relative to its parent.
     * @authors Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class ComponentTransform extends FudgeCore.Component {
        constructor(_matrix = FudgeCore.Matrix4x4.IDENTITY) {
            super();
            this.local = _matrix;
        }
        //#region Transfer
        serialize() {
            let serialization = {
                local: this.local.serialize(),
                [super.constructor.name]: super.serialize()
            };
            return serialization;
        }
        deserialize(_serialization) {
            super.deserialize(_serialization[super.constructor.name]);
            this.local.deserialize(_serialization.local);
            return this;
        }
        // public mutate(_mutator: Mutator): void {
        //     this.local.mutate(_mutator);
        // }
        // public getMutator(): Mutator { 
        //     return this.local.getMutator();
        // }
        // public getMutatorAttributeTypes(_mutator: Mutator): MutatorAttributeTypes {
        //     let types: MutatorAttributeTypes = this.local.getMutatorAttributeTypes(_mutator);
        //     return types;
        // }
        reduceMutator(_mutator) {
            delete _mutator.world;
            super.reduceMutator(_mutator);
        }
    }
    FudgeCore.ComponentTransform = ComponentTransform;
})(FudgeCore || (FudgeCore = {}));
// <reference path="DebugAlert.ts"/>
var FudgeCore;
// <reference path="DebugAlert.ts"/>
(function (FudgeCore) {
    /**
     * The filters corresponding to debug activities, more to come
     */
    let DEBUG_FILTER;
    (function (DEBUG_FILTER) {
        DEBUG_FILTER[DEBUG_FILTER["NONE"] = 0] = "NONE";
        DEBUG_FILTER[DEBUG_FILTER["INFO"] = 1] = "INFO";
        DEBUG_FILTER[DEBUG_FILTER["LOG"] = 2] = "LOG";
        DEBUG_FILTER[DEBUG_FILTER["WARN"] = 4] = "WARN";
        DEBUG_FILTER[DEBUG_FILTER["ERROR"] = 8] = "ERROR";
        DEBUG_FILTER[DEBUG_FILTER["ALL"] = 15] = "ALL";
    })(DEBUG_FILTER = FudgeCore.DEBUG_FILTER || (FudgeCore.DEBUG_FILTER = {}));
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Base class for the different DebugTargets, mainly for technical purpose of inheritance
     */
    class DebugTarget {
        static mergeArguments(_message, ..._args) {
            let out = JSON.stringify(_message);
            for (let arg of _args)
                out += "\n" + JSON.stringify(arg, null, 2);
            return out;
        }
    }
    FudgeCore.DebugTarget = DebugTarget;
})(FudgeCore || (FudgeCore = {}));
/// <reference path="DebugTarget.ts"/>
var FudgeCore;
/// <reference path="DebugTarget.ts"/>
(function (FudgeCore) {
    /**
     * Routing to the alert box
     */
    class DebugAlert extends FudgeCore.DebugTarget {
        static createDelegate(_headline) {
            let delegate = function (_message, ..._args) {
                let out = _headline + "\n\n" + FudgeCore.DebugTarget.mergeArguments(_message, ..._args);
                alert(out);
            };
            return delegate;
        }
    }
    DebugAlert.delegates = {
        [FudgeCore.DEBUG_FILTER.INFO]: DebugAlert.createDelegate("Info"),
        [FudgeCore.DEBUG_FILTER.LOG]: DebugAlert.createDelegate("Log"),
        [FudgeCore.DEBUG_FILTER.WARN]: DebugAlert.createDelegate("Warn"),
        [FudgeCore.DEBUG_FILTER.ERROR]: DebugAlert.createDelegate("Error")
    };
    FudgeCore.DebugAlert = DebugAlert;
})(FudgeCore || (FudgeCore = {}));
/// <reference path="DebugTarget.ts"/>
var FudgeCore;
/// <reference path="DebugTarget.ts"/>
(function (FudgeCore) {
    /**
     * Routing to the standard-console
     */
    class DebugConsole extends FudgeCore.DebugTarget {
    }
    DebugConsole.delegates = {
        [FudgeCore.DEBUG_FILTER.INFO]: console.info,
        [FudgeCore.DEBUG_FILTER.LOG]: console.log,
        [FudgeCore.DEBUG_FILTER.WARN]: console.warn,
        [FudgeCore.DEBUG_FILTER.ERROR]: console.error
    };
    FudgeCore.DebugConsole = DebugConsole;
})(FudgeCore || (FudgeCore = {}));
/// <reference path="DebugInterfaces.ts"/>
/// <reference path="DebugAlert.ts"/>
/// <reference path="DebugConsole.ts"/>
var FudgeCore;
/// <reference path="DebugInterfaces.ts"/>
/// <reference path="DebugAlert.ts"/>
/// <reference path="DebugConsole.ts"/>
(function (FudgeCore) {
    /**
     * The Debug-Class offers functions known from the console-object and additions,
     * routing the information to various [[DebugTargets]] that can be easily defined by the developers and registerd by users
     */
    class Debug {
        /**
         * De- / Activate a filter for the given DebugTarget.
         * @param _target
         * @param _filter
         */
        static setFilter(_target, _filter) {
            for (let filter in Debug.delegates)
                Debug.delegates[filter].delete(_target);
            for (let filter in FudgeCore.DEBUG_FILTER) {
                let parsed = parseInt(filter);
                if (parsed == FudgeCore.DEBUG_FILTER.ALL)
                    break;
                if (_filter & parsed)
                    Debug.delegates[parsed].set(_target, _target.delegates[parsed]);
            }
        }
        /**
         * Debug function to be implemented by the DebugTarget.
         * info(...) displays additional information with low priority
         * @param _message
         * @param _args
         */
        static info(_message, ..._args) {
            Debug.delegate(FudgeCore.DEBUG_FILTER.INFO, _message, _args);
        }
        /**
         * Debug function to be implemented by the DebugTarget.
         * log(...) displays information with medium priority
         * @param _message
         * @param _args
         */
        static log(_message, ..._args) {
            Debug.delegate(FudgeCore.DEBUG_FILTER.LOG, _message, _args);
        }
        /**
         * Debug function to be implemented by the DebugTarget.
         * warn(...) displays information about non-conformities in usage, which is emphasized e.g. by color
         * @param _message
         * @param _args
         */
        static warn(_message, ..._args) {
            Debug.delegate(FudgeCore.DEBUG_FILTER.WARN, _message, _args);
        }
        /**
         * Debug function to be implemented by the DebugTarget.
         * error(...) displays critical information about failures, which is emphasized e.g. by color
         * @param _message
         * @param _args
         */
        static error(_message, ..._args) {
            Debug.delegate(FudgeCore.DEBUG_FILTER.ERROR, _message, _args);
        }
        /**
         * Lookup all delegates registered to the filter and call them using the given arguments
         * @param _filter
         * @param _message
         * @param _args
         */
        static delegate(_filter, _message, _args) {
            let delegates = Debug.delegates[_filter];
            for (let delegate of delegates.values())
                if (_args.length > 0)
                    delegate(_message, ..._args);
                else
                    delegate(_message);
        }
    }
    /**
     * For each set filter, this associative array keeps references to the registered delegate functions of the chosen [[DebugTargets]]
     */
    // TODO: implement anonymous function setting up all filters
    Debug.delegates = {
        [FudgeCore.DEBUG_FILTER.INFO]: new Map([[FudgeCore.DebugConsole, FudgeCore.DebugConsole.delegates[FudgeCore.DEBUG_FILTER.INFO]]]),
        [FudgeCore.DEBUG_FILTER.LOG]: new Map([[FudgeCore.DebugConsole, FudgeCore.DebugConsole.delegates[FudgeCore.DEBUG_FILTER.LOG]]]),
        [FudgeCore.DEBUG_FILTER.WARN]: new Map([[FudgeCore.DebugConsole, FudgeCore.DebugConsole.delegates[FudgeCore.DEBUG_FILTER.WARN]]]),
        [FudgeCore.DEBUG_FILTER.ERROR]: new Map([[FudgeCore.DebugConsole, FudgeCore.DebugConsole.delegates[FudgeCore.DEBUG_FILTER.ERROR]]])
    };
    FudgeCore.Debug = Debug;
})(FudgeCore || (FudgeCore = {}));
/// <reference path="DebugTarget.ts"/>
var FudgeCore;
/// <reference path="DebugTarget.ts"/>
(function (FudgeCore) {
    /**
     * Routing to a HTMLDialogElement
     */
    class DebugDialog extends FudgeCore.DebugTarget {
    }
    FudgeCore.DebugDialog = DebugDialog;
})(FudgeCore || (FudgeCore = {}));
/// <reference path="DebugTarget.ts"/>
var FudgeCore;
/// <reference path="DebugTarget.ts"/>
(function (FudgeCore) {
    /**
     * Route to an HTMLTextArea, may be obsolete when using HTMLDialogElement
     */
    class DebugTextArea extends FudgeCore.DebugTarget {
        static createDelegate(_headline) {
            let delegate = function (_message, ..._args) {
                let out = _headline + "\n\n" + FudgeCore.DebugTarget.mergeArguments(_message, _args);
                DebugTextArea.textArea.textContent += out;
            };
            return delegate;
        }
    }
    DebugTextArea.textArea = document.createElement("textarea");
    DebugTextArea.delegates = {
        [FudgeCore.DEBUG_FILTER.INFO]: FudgeCore.DebugAlert.createDelegate("Info")
    };
    FudgeCore.DebugTextArea = DebugTextArea;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Defines a color as values in the range of 0 to 1 for the four channels red, green, blue and alpha (for opacity)
     */
    class Color extends FudgeCore.Mutable {
        constructor(_r = 1, _g = 1, _b = 1, _a = 1) {
            super();
            this.setNormRGBA(_r, _g, _b, _a);
        }
        static get BLACK() {
            return new Color(0, 0, 0, 1);
        }
        static get WHITE() {
            return new Color(1, 1, 1, 1);
        }
        static get RED() {
            return new Color(1, 0, 0, 1);
        }
        static get GREEN() {
            return new Color(0, 1, 0, 1);
        }
        static get BLUE() {
            return new Color(0, 0, 1, 1);
        }
        static get YELLOW() {
            return new Color(1, 1, 0, 1);
        }
        static get CYAN() {
            return new Color(0, 1, 1, 1);
        }
        static get MAGENTA() {
            return new Color(1, 0, 1, 1);
        }
        setNormRGBA(_r, _g, _b, _a) {
            this.r = Math.min(1, Math.max(0, _r));
            this.g = Math.min(1, Math.max(0, _g));
            this.b = Math.min(1, Math.max(0, _b));
            this.a = Math.min(1, Math.max(0, _a));
        }
        setBytesRGBA(_r, _g, _b, _a) {
            this.setNormRGBA(_r / 255, _g / 255, _b / 255, _a / 255);
        }
        getArray() {
            return new Float32Array([this.r, this.g, this.b, this.a]);
        }
        setArrayNormRGBA(_color) {
            this.setNormRGBA(_color[0], _color[1], _color[2], _color[3]);
        }
        setArrayBytesRGBA(_color) {
            this.setBytesRGBA(_color[0], _color[1], _color[2], _color[3]);
        }
        reduceMutator(_mutator) { }
    }
    FudgeCore.Color = Color;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Baseclass for materials. Combines a [[Shader]] with a compatible [[Coat]]
     * @authors Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class Material {
        constructor(_name, _shader, _coat) {
            this.idResource = undefined;
            this.name = _name;
            this.shaderType = _shader;
            if (_shader) {
                if (_coat)
                    this.setCoat(_coat);
                else
                    this.setCoat(this.createCoatMatchingShader());
            }
        }
        /**
         * Creates a new [[Coat]] instance that is valid for the [[Shader]] referenced by this material
         */
        createCoatMatchingShader() {
            let coat = new (this.shaderType.getCoat())();
            return coat;
        }
        /**
         * Makes this material reference the given [[Coat]] if it is compatible with the referenced [[Shader]]
         * @param _coat
         */
        setCoat(_coat) {
            if (_coat.constructor != this.shaderType.getCoat())
                throw (new Error("Shader and coat don't match"));
            this.coat = _coat;
        }
        /**
         * Returns the currently referenced [[Coat]] instance
         */
        getCoat() {
            return this.coat;
        }
        /**
         * Changes the materials reference to the given [[Shader]], creates and references a new [[Coat]] instance
         * and mutates the new coat to preserve matching properties.
         * @param _shaderType
         */
        setShader(_shaderType) {
            this.shaderType = _shaderType;
            let coat = this.createCoatMatchingShader();
            coat.mutate(this.coat.getMutator());
            this.setCoat(coat);
        }
        /**
         * Returns the [[Shader]] referenced by this material
         */
        getShader() {
            return this.shaderType;
        }
        //#region Transfer
        // TODO: this type of serialization was implemented for implicit Material create. Check if obsolete when only one material class exists and/or materials are stored separately
        serialize() {
            let serialization = {
                name: this.name,
                idResource: this.idResource,
                shader: this.shaderType.name,
                coat: FudgeCore.Serializer.serialize(this.coat)
            };
            return serialization;
        }
        deserialize(_serialization) {
            this.name = _serialization.name;
            this.idResource = _serialization.idResource;
            // TODO: provide for shaders in the users namespace. See Serializer fullpath etc.
            // tslint:disable-next-line: no-any
            this.shaderType = FudgeCore[_serialization.shader];
            let coat = FudgeCore.Serializer.deserialize(_serialization.coat);
            this.setCoat(coat);
            return this;
        }
    }
    FudgeCore.Material = Material;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Keeps a depot of objects that have been marked for reuse, sorted by type.
     * Using [[Recycler]] reduces load on the carbage collector and thus supports smooth performance
     */
    class Recycler {
        /**
         * Returns an object of the requested type from the depot, or a new one, if the depot was empty
         * @param _T The class identifier of the desired object
         */
        static get(_T) {
            let key = _T.name;
            let instances = Recycler.depot[key];
            if (instances && instances.length > 0)
                return instances.pop();
            else
                return new _T();
        }
        /**
         * Stores the object in the depot for later recycling. Users are responsible for throwing in objects that are about to loose scope and are not referenced by any other
         * @param _instance
         */
        static store(_instance) {
            let key = _instance.constructor.name;
            //Debug.log(key);
            let instances = Recycler.depot[key] || [];
            instances.push(_instance);
            Recycler.depot[key] = instances;
            // Debug.log(`ObjectManager.depot[${key}]: ${ObjectManager.depot[key].length}`);
            //Debug.log(this.depot);
        }
        /**
         * Emptys the depot of a given type, leaving the objects for the garbage collector. May result in a short stall when many objects were in
         * @param _T
         */
        static dump(_T) {
            let key = _T.name;
            Recycler.depot[key] = [];
        }
        /**
         * Emptys all depots, leaving all objects to the garbage collector. May result in a short stall when many objects were in
         */
        static dumpAll() {
            Recycler.depot = {};
        }
    }
    Recycler.depot = {};
    FudgeCore.Recycler = Recycler;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Static class handling the resources used with the current FUDGE-instance.
     * Keeps a list of the resources and generates ids to retrieve them.
     * Resources are objects referenced multiple times but supposed to be stored only once
     */
    class ResourceManager {
        /**
         * Generates an id for the resources and registers it with the list of resources
         * @param _resource
         */
        static register(_resource) {
            if (!_resource.idResource)
                _resource.idResource = ResourceManager.generateId(_resource);
            ResourceManager.resources[_resource.idResource] = _resource;
        }
        /**
         * Generate a user readable and unique id using the type of the resource, the date and random numbers
         * @param _resource
         */
        static generateId(_resource) {
            // TODO: build id and integrate info from resource, not just date
            let idResource;
            do
                idResource = _resource.constructor.name + "|" + new Date().toISOString() + "|" + Math.random().toPrecision(5).substr(2, 5);
            while (ResourceManager.resources[idResource]);
            return idResource;
        }
        /**
         * Tests, if an object is a [[SerializableResource]]
         * @param _object The object to examine
         */
        static isResource(_object) {
            return (Reflect.has(_object, "idResource"));
        }
        /**
         * Retrieves the resource stored with the given id
         * @param _idResource
         */
        static get(_idResource) {
            let resource = ResourceManager.resources[_idResource];
            if (!resource) {
                let serialization = ResourceManager.serialization[_idResource];
                if (!serialization) {
                    FudgeCore.Debug.error("Resource not found", _idResource);
                    return null;
                }
                resource = ResourceManager.deserializeResource(serialization);
            }
            return resource;
        }
        /**
         * Creates and registers a resource from a [[Node]], copying the complete branch starting with it
         * @param _node A node to create the resource from
         * @param _replaceWithInstance if true (default), the node used as origin is replaced by a [[NodeResourceInstance]] of the [[NodeResource]] created
         */
        static registerNodeAsResource(_node, _replaceWithInstance = true) {
            let serialization = _node.serialize();
            let nodeResource = new FudgeCore.NodeResource("NodeResource");
            nodeResource.deserialize(serialization);
            ResourceManager.register(nodeResource);
            if (_replaceWithInstance && _node.getParent()) {
                let instance = new FudgeCore.NodeResourceInstance(nodeResource);
                _node.getParent().replaceChild(_node, instance);
            }
            return nodeResource;
        }
        /**
         * Serialize all resources
         */
        static serialize() {
            let serialization = {};
            for (let idResource in ResourceManager.resources) {
                let resource = ResourceManager.resources[idResource];
                if (idResource != resource.idResource)
                    FudgeCore.Debug.error("Resource-id mismatch", resource);
                serialization[idResource] = FudgeCore.Serializer.serialize(resource);
            }
            return serialization;
        }
        /**
         * Create resources from a serialization, deleting all resources previously registered
         * @param _serialization
         */
        static deserialize(_serialization) {
            ResourceManager.serialization = _serialization;
            ResourceManager.resources = {};
            for (let idResource in _serialization) {
                let serialization = _serialization[idResource];
                let resource = ResourceManager.deserializeResource(serialization);
                if (resource)
                    ResourceManager.resources[idResource] = resource;
            }
            return ResourceManager.resources;
        }
        static deserializeResource(_serialization) {
            return FudgeCore.Serializer.deserialize(_serialization);
        }
    }
    ResourceManager.resources = {};
    ResourceManager.serialization = null;
    FudgeCore.ResourceManager = ResourceManager;
})(FudgeCore || (FudgeCore = {}));
/// <reference path="../Light/Light.ts"/>
/// <reference path="../Component/ComponentLight.ts"/>
var FudgeCore;
/// <reference path="../Light/Light.ts"/>
/// <reference path="../Component/ComponentLight.ts"/>
(function (FudgeCore) {
    /**
     * Controls the rendering of a branch of a scenetree, using the given [[ComponentCamera]],
     * and the propagation of the rendered image from the offscreen renderbuffer to the target canvas
     * through a series of [[Framing]] objects. The stages involved are in order of rendering
     * [[RenderManager]].viewport -> [[Viewport]].source -> [[Viewport]].destination -> DOM-Canvas -> Client(CSS)
     * @authors Jascha Karagöl, HFU, 2019 | Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class Viewport extends EventTarget {
        constructor() {
            super(...arguments);
            this.name = "Viewport"; // The name to call this viewport by.
            this.camera = null; // The camera representing the view parameters to render the branch.
            // TODO: verify if client to canvas should be in Viewport or somewhere else (Window, Container?)
            // Multiple viewports using the same canvas shouldn't differ here...
            // different framing methods can be used, this is the default
            this.frameClientToCanvas = new FudgeCore.FramingScaled();
            this.frameCanvasToDestination = new FudgeCore.FramingComplex();
            this.frameDestinationToSource = new FudgeCore.FramingScaled();
            this.frameSourceToRender = new FudgeCore.FramingScaled();
            this.adjustingFrames = true;
            this.adjustingCamera = true;
            this.lights = null;
            this.branch = null; // The first node in the tree(branch) that will be rendered.
            this.crc2 = null;
            this.canvas = null;
            this.pickBuffers = [];
            /**
             * Handle drag-drop events and dispatch to viewport as FUDGE-Event
             */
            this.hndDragDropEvent = (_event) => {
                let _dragevent = _event;
                switch (_dragevent.type) {
                    case "dragover":
                    case "drop":
                        _dragevent.preventDefault();
                        _dragevent.dataTransfer.effectAllowed = "none";
                        break;
                    case "dragstart":
                        // just dummy data,  valid data should be set in handler registered by the user
                        _dragevent.dataTransfer.setData("text", "Hallo");
                        // TODO: check if there is a better solution to hide the ghost image of the draggable object
                        _dragevent.dataTransfer.setDragImage(new Image(), 0, 0);
                        break;
                }
                let event = new FudgeCore.DragDropEventƒ("ƒ" + _event.type, _dragevent);
                this.addCanvasPosition(event);
                this.dispatchEvent(event);
            };
            /**
             * Handle pointer events and dispatch to viewport as FUDGE-Event
             */
            this.hndPointerEvent = (_event) => {
                let event = new FudgeCore.PointerEventƒ("ƒ" + _event.type, _event);
                this.addCanvasPosition(event);
                this.dispatchEvent(event);
            };
            /**
             * Handle keyboard events and dispatch to viewport as FUDGE-Event, if the viewport has the focus
             */
            this.hndKeyboardEvent = (_event) => {
                if (!this.hasFocus)
                    return;
                let event = new FudgeCore.KeyboardEventƒ("ƒ" + _event.type, _event);
                this.dispatchEvent(event);
            };
            /**
             * Handle wheel event and dispatch to viewport as FUDGE-Event
             */
            this.hndWheelEvent = (_event) => {
                let event = new FudgeCore.WheelEventƒ("ƒ" + _event.type, _event);
                this.dispatchEvent(event);
            };
        }
        /**
         * Connects the viewport to the given canvas to render the given branch to using the given camera-component, and names the viewport as given.
         * @param _name
         * @param _branch
         * @param _camera
         * @param _canvas
         */
        initialize(_name, _branch, _camera, _canvas) {
            this.name = _name;
            this.camera = _camera;
            this.canvas = _canvas;
            this.crc2 = _canvas.getContext("2d");
            this.rectSource = FudgeCore.RenderManager.getCanvasRect();
            this.rectDestination = this.getClientRectangle();
            this.setBranch(_branch);
        }
        /**
         * Retrieve the 2D-context attached to the destination canvas
         */
        getContext() {
            return this.crc2;
        }
        /**
         * Retrieve the size of the destination canvas as a rectangle, x and y are always 0
         */
        getCanvasRectangle() {
            return FudgeCore.Rectangle.GET(0, 0, this.canvas.width, this.canvas.height);
        }
        /**
         * Retrieve the client rectangle the canvas is displayed and fit in, x and y are always 0
         */
        getClientRectangle() {
            return FudgeCore.Rectangle.GET(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
        }
        /**
         * Set the branch to be drawn in the viewport.
         */
        setBranch(_branch) {
            if (this.branch) {
                this.branch.removeEventListener("componentAdd" /* COMPONENT_ADD */, this.hndComponentEvent);
                this.branch.removeEventListener("componentRemove" /* COMPONENT_REMOVE */, this.hndComponentEvent);
            }
            this.branch = _branch;
            this.collectLights();
            this.branch.addEventListener("componentAdd" /* COMPONENT_ADD */, this.hndComponentEvent);
            this.branch.addEventListener("componentRemove" /* COMPONENT_REMOVE */, this.hndComponentEvent);
        }
        /**
         * Logs this viewports scenegraph to the console.
         */
        showSceneGraph() {
            // TODO: move to debug-class
            let output = "SceneGraph for this viewport:";
            output += "\n \n";
            output += this.branch.name;
            FudgeCore.Debug.log(output + "   => ROOTNODE" + this.createSceneGraph(this.branch));
        }
        // #region Drawing
        /**
         * Draw this viewport
         */
        draw() {
            FudgeCore.RenderManager.resetFrameBuffer();
            if (!this.camera.isActive)
                return;
            if (this.adjustingFrames)
                this.adjustFrames();
            if (this.adjustingCamera)
                this.adjustCamera();
            FudgeCore.RenderManager.clear(this.camera.getBackgoundColor());
            if (FudgeCore.RenderManager.addBranch(this.branch))
                // branch has not yet been processed fully by rendermanager -> update all registered nodes
                FudgeCore.RenderManager.update();
            FudgeCore.RenderManager.setLights(this.lights);
            FudgeCore.RenderManager.drawBranch(this.branch, this.camera);
            this.crc2.imageSmoothingEnabled = false;
            this.crc2.drawImage(FudgeCore.RenderManager.getCanvas(), this.rectSource.x, this.rectSource.y, this.rectSource.width, this.rectSource.height, this.rectDestination.x, this.rectDestination.y, this.rectDestination.width, this.rectDestination.height);
        }
        /**
        * Draw this viewport for RayCast
        */
        createPickBuffers() {
            if (this.adjustingFrames)
                this.adjustFrames();
            if (this.adjustingCamera)
                this.adjustCamera();
            if (FudgeCore.RenderManager.addBranch(this.branch))
                // branch has not yet been processed fully by rendermanager -> update all registered nodes
                FudgeCore.RenderManager.update();
            this.pickBuffers = FudgeCore.RenderManager.drawBranchForRayCast(this.branch, this.camera);
            this.crc2.imageSmoothingEnabled = false;
            this.crc2.drawImage(FudgeCore.RenderManager.getCanvas(), this.rectSource.x, this.rectSource.y, this.rectSource.width, this.rectSource.height, this.rectDestination.x, this.rectDestination.y, this.rectDestination.width, this.rectDestination.height);
        }
        pickNodeAt(_pos) {
            // this.createPickBuffers();
            let hits = FudgeCore.RenderManager.pickNodeAt(_pos, this.pickBuffers, this.rectSource);
            hits.sort((a, b) => (b.zBuffer > 0) ? (a.zBuffer > 0) ? a.zBuffer - b.zBuffer : 1 : -1);
            return hits;
        }
        /**
         * Adjust all frames involved in the rendering process from the display area in the client up to the renderer canvas
         */
        adjustFrames() {
            // get the rectangle of the canvas area as displayed (consider css)
            let rectClient = this.getClientRectangle();
            // adjust the canvas size according to the given framing applied to client
            let rectCanvas = this.frameClientToCanvas.getRect(rectClient);
            this.canvas.width = rectCanvas.width;
            this.canvas.height = rectCanvas.height;
            // adjust the destination area on the target-canvas to render to by applying the framing to canvas
            this.rectDestination = this.frameCanvasToDestination.getRect(rectCanvas);
            // adjust the area on the source-canvas to render from by applying the framing to destination area
            this.rectSource = this.frameDestinationToSource.getRect(this.rectDestination);
            // having an offset source does make sense only when multiple viewports display parts of the same rendering. For now: shift it to 0,0
            this.rectSource.x = this.rectSource.y = 0;
            // still, a partial image of the rendering may be retrieved by moving and resizing the render viewport
            let rectRender = this.frameSourceToRender.getRect(this.rectSource);
            FudgeCore.RenderManager.setViewportRectangle(rectRender);
            // no more transformation after this for now, offscreen canvas and render-viewport have the same size
            FudgeCore.RenderManager.setCanvasSize(rectRender.width, rectRender.height);
        }
        /**
         * Adjust the camera parameters to fit the rendering into the render vieport
         */
        adjustCamera() {
            let rect = FudgeCore.RenderManager.getViewportRectangle();
            this.camera.projectCentral(rect.width / rect.height, this.camera.getFieldOfView());
        }
        // #endregion
        //#region Points
        pointClientToSource(_client) {
            let result;
            let rect;
            rect = this.getClientRectangle();
            result = this.frameClientToCanvas.getPoint(_client, rect);
            rect = this.getCanvasRectangle();
            result = this.frameCanvasToDestination.getPoint(result, rect);
            result = this.frameDestinationToSource.getPoint(result, this.rectSource);
            //TODO: when Source, Render and RenderViewport deviate, continue transformation 
            return result;
        }
        pointSourceToRender(_source) {
            let projectionRectangle = this.camera.getProjectionRectangle();
            let point = this.frameSourceToRender.getPoint(_source, projectionRectangle);
            return point;
        }
        pointClientToRender(_client) {
            let point = this.pointClientToSource(_client);
            point = this.pointSourceToRender(point);
            //TODO: when Render and RenderViewport deviate, continue transformation 
            return point;
        }
        //#endregion
        // #region Events (passing from canvas to viewport and from there into branch)
        /**
         * Returns true if this viewport currently has focus and thus receives keyboard events
         */
        get hasFocus() {
            return (Viewport.focus == this);
        }
        /**
         * Switch the viewports focus on or off. Only one viewport in one FUDGE instance can have the focus, thus receiving keyboard events.
         * So a viewport currently having the focus will lose it, when another one receives it. The viewports fire [[Event]]s accordingly.
         *
         * @param _on
         */
        setFocus(_on) {
            if (_on) {
                if (Viewport.focus == this)
                    return;
                if (Viewport.focus)
                    Viewport.focus.dispatchEvent(new Event("focusout" /* FOCUS_OUT */));
                Viewport.focus = this;
                this.dispatchEvent(new Event("focusin" /* FOCUS_IN */));
            }
            else {
                if (Viewport.focus != this)
                    return;
                this.dispatchEvent(new Event("focusout" /* FOCUS_OUT */));
                Viewport.focus = null;
            }
        }
        /**
         * De- / Activates the given pointer event to be propagated into the viewport as FUDGE-Event
         * @param _type
         * @param _on
         */
        activatePointerEvent(_type, _on) {
            this.activateEvent(this.canvas, _type, this.hndPointerEvent, _on);
        }
        /**
         * De- / Activates the given keyboard event to be propagated into the viewport as FUDGE-Event
         * @param _type
         * @param _on
         */
        activateKeyboardEvent(_type, _on) {
            this.activateEvent(this.canvas.ownerDocument, _type, this.hndKeyboardEvent, _on);
        }
        /**
         * De- / Activates the given drag-drop event to be propagated into the viewport as FUDGE-Event
         * @param _type
         * @param _on
         */
        activateDragDropEvent(_type, _on) {
            if (_type == "\u0192dragstart" /* START */)
                this.canvas.draggable = _on;
            this.activateEvent(this.canvas, _type, this.hndDragDropEvent, _on);
        }
        /**
         * De- / Activates the wheel event to be propagated into the viewport as FUDGE-Event
         * @param _type
         * @param _on
         */
        activateWheelEvent(_type, _on) {
            this.activateEvent(this.canvas, _type, this.hndWheelEvent, _on);
        }
        /**
         * Add position of the pointer mapped to canvas-coordinates as canvasX, canvasY to the event
         * @param event
         */
        addCanvasPosition(event) {
            event.canvasX = this.canvas.width * event.pointerX / event.clientRect.width;
            event.canvasY = this.canvas.height * event.pointerY / event.clientRect.height;
        }
        activateEvent(_target, _type, _handler, _on) {
            _type = _type.slice(1); // chip the ƒlorentin
            if (_on)
                _target.addEventListener(_type, _handler);
            else
                _target.removeEventListener(_type, _handler);
        }
        hndComponentEvent(_event) {
            FudgeCore.Debug.log(_event);
        }
        // #endregion
        /**
         * Collect all lights in the branch to pass to shaders
         */
        collectLights() {
            // TODO: make private
            this.lights = new Map();
            for (let node of this.branch.branch) {
                let cmpLights = node.getComponents(FudgeCore.ComponentLight);
                for (let cmpLight of cmpLights) {
                    let type = cmpLight.light.type;
                    let lightsOfType = this.lights.get(type);
                    if (!lightsOfType) {
                        lightsOfType = [];
                        this.lights.set(type, lightsOfType);
                    }
                    lightsOfType.push(cmpLight);
                }
            }
        }
        /**
         * Creates an outputstring as visual representation of this viewports scenegraph. Called for the passed node and recursive for all its children.
         * @param _fudgeNode The node to create a scenegraphentry for.
         */
        createSceneGraph(_fudgeNode) {
            // TODO: move to debug-class
            let output = "";
            for (let name in _fudgeNode.getChildren()) {
                let child = _fudgeNode.getChildren()[name];
                output += "\n";
                let current = child;
                if (current.getParent() && current.getParent().getParent())
                    output += "|";
                while (current.getParent() && current.getParent().getParent()) {
                    output += "   ";
                    current = current.getParent();
                }
                output += "'--";
                output += child.name;
                output += this.createSceneGraph(child);
            }
            return output;
        }
    }
    FudgeCore.Viewport = Viewport;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    class PointerEventƒ extends PointerEvent {
        constructor(type, _event) {
            super(type, _event);
            let target = _event.target;
            this.clientRect = target.getClientRects()[0];
            this.pointerX = _event.clientX - this.clientRect.left;
            this.pointerY = _event.clientY - this.clientRect.top;
        }
    }
    FudgeCore.PointerEventƒ = PointerEventƒ;
    class DragDropEventƒ extends DragEvent {
        constructor(type, _event) {
            super(type, _event);
            let target = _event.target;
            this.clientRect = target.getClientRects()[0];
            this.pointerX = _event.clientX - this.clientRect.left;
            this.pointerY = _event.clientY - this.clientRect.top;
        }
    }
    FudgeCore.DragDropEventƒ = DragDropEventƒ;
    class WheelEventƒ extends WheelEvent {
        constructor(type, _event) {
            super(type, _event);
        }
    }
    FudgeCore.WheelEventƒ = WheelEventƒ;
    /**
     * Base class for EventTarget singletons, which are fixed entities in the structure of Fudge, such as the core loop
     */
    class EventTargetStatic extends EventTarget {
        constructor() {
            super();
        }
        static addEventListener(_type, _handler) {
            EventTargetStatic.targetStatic.addEventListener(_type, _handler);
        }
        static removeEventListener(_type, _handler) {
            EventTargetStatic.targetStatic.removeEventListener(_type, _handler);
        }
        static dispatchEvent(_event) {
            EventTargetStatic.targetStatic.dispatchEvent(_event);
            return true;
        }
    }
    EventTargetStatic.targetStatic = new EventTargetStatic();
    FudgeCore.EventTargetStatic = EventTargetStatic;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    class KeyboardEventƒ extends KeyboardEvent {
        constructor(type, _event) {
            super(type, _event);
        }
    }
    FudgeCore.KeyboardEventƒ = KeyboardEventƒ;
    /**
     * The codes sent from a standard english keyboard layout
     */
    let KEYBOARD_CODE;
    (function (KEYBOARD_CODE) {
        KEYBOARD_CODE["A"] = "KeyA";
        KEYBOARD_CODE["B"] = "KeyB";
        KEYBOARD_CODE["C"] = "KeyC";
        KEYBOARD_CODE["D"] = "KeyD";
        KEYBOARD_CODE["E"] = "KeyE";
        KEYBOARD_CODE["F"] = "KeyF";
        KEYBOARD_CODE["G"] = "KeyG";
        KEYBOARD_CODE["H"] = "KeyH";
        KEYBOARD_CODE["I"] = "KeyI";
        KEYBOARD_CODE["J"] = "KeyJ";
        KEYBOARD_CODE["K"] = "KeyK";
        KEYBOARD_CODE["L"] = "KeyL";
        KEYBOARD_CODE["M"] = "KeyM";
        KEYBOARD_CODE["N"] = "KeyN";
        KEYBOARD_CODE["O"] = "KeyO";
        KEYBOARD_CODE["P"] = "KeyP";
        KEYBOARD_CODE["Q"] = "KeyQ";
        KEYBOARD_CODE["R"] = "KeyR";
        KEYBOARD_CODE["S"] = "KeyS";
        KEYBOARD_CODE["T"] = "KeyT";
        KEYBOARD_CODE["U"] = "KeyU";
        KEYBOARD_CODE["V"] = "KeyV";
        KEYBOARD_CODE["W"] = "KeyW";
        KEYBOARD_CODE["X"] = "KeyX";
        KEYBOARD_CODE["Y"] = "KeyY";
        KEYBOARD_CODE["Z"] = "KeyZ";
        KEYBOARD_CODE["ESC"] = "Escape";
        KEYBOARD_CODE["ZERO"] = "Digit0";
        KEYBOARD_CODE["ONE"] = "Digit1";
        KEYBOARD_CODE["TWO"] = "Digit2";
        KEYBOARD_CODE["THREE"] = "Digit3";
        KEYBOARD_CODE["FOUR"] = "Digit4";
        KEYBOARD_CODE["FIVE"] = "Digit5";
        KEYBOARD_CODE["SIX"] = "Digit6";
        KEYBOARD_CODE["SEVEN"] = "Digit7";
        KEYBOARD_CODE["EIGHT"] = "Digit8";
        KEYBOARD_CODE["NINE"] = "Digit9";
        KEYBOARD_CODE["MINUS"] = "Minus";
        KEYBOARD_CODE["EQUAL"] = "Equal";
        KEYBOARD_CODE["BACKSPACE"] = "Backspace";
        KEYBOARD_CODE["TABULATOR"] = "Tab";
        KEYBOARD_CODE["BRACKET_LEFT"] = "BracketLeft";
        KEYBOARD_CODE["BRACKET_RIGHT"] = "BracketRight";
        KEYBOARD_CODE["ENTER"] = "Enter";
        KEYBOARD_CODE["CTRL_LEFT"] = "ControlLeft";
        KEYBOARD_CODE["SEMICOLON"] = "Semicolon";
        KEYBOARD_CODE["QUOTE"] = "Quote";
        KEYBOARD_CODE["BACK_QUOTE"] = "Backquote";
        KEYBOARD_CODE["SHIFT_LEFT"] = "ShiftLeft";
        KEYBOARD_CODE["BACKSLASH"] = "Backslash";
        KEYBOARD_CODE["COMMA"] = "Comma";
        KEYBOARD_CODE["PERIOD"] = "Period";
        KEYBOARD_CODE["SLASH"] = "Slash";
        KEYBOARD_CODE["SHIFT_RIGHT"] = "ShiftRight";
        KEYBOARD_CODE["NUMPAD_MULTIPLY"] = "NumpadMultiply";
        KEYBOARD_CODE["ALT_LEFT"] = "AltLeft";
        KEYBOARD_CODE["SPACE"] = "Space";
        KEYBOARD_CODE["CAPS_LOCK"] = "CapsLock";
        KEYBOARD_CODE["F1"] = "F1";
        KEYBOARD_CODE["F2"] = "F2";
        KEYBOARD_CODE["F3"] = "F3";
        KEYBOARD_CODE["F4"] = "F4";
        KEYBOARD_CODE["F5"] = "F5";
        KEYBOARD_CODE["F6"] = "F6";
        KEYBOARD_CODE["F7"] = "F7";
        KEYBOARD_CODE["F8"] = "F8";
        KEYBOARD_CODE["F9"] = "F9";
        KEYBOARD_CODE["F10"] = "F10";
        KEYBOARD_CODE["PAUSE"] = "Pause";
        KEYBOARD_CODE["SCROLL_LOCK"] = "ScrollLock";
        KEYBOARD_CODE["NUMPAD7"] = "Numpad7";
        KEYBOARD_CODE["NUMPAD8"] = "Numpad8";
        KEYBOARD_CODE["NUMPAD9"] = "Numpad9";
        KEYBOARD_CODE["NUMPAD_SUBTRACT"] = "NumpadSubtract";
        KEYBOARD_CODE["NUMPAD4"] = "Numpad4";
        KEYBOARD_CODE["NUMPAD5"] = "Numpad5";
        KEYBOARD_CODE["NUMPAD6"] = "Numpad6";
        KEYBOARD_CODE["NUMPAD_ADD"] = "NumpadAdd";
        KEYBOARD_CODE["NUMPAD1"] = "Numpad1";
        KEYBOARD_CODE["NUMPAD2"] = "Numpad2";
        KEYBOARD_CODE["NUMPAD3"] = "Numpad3";
        KEYBOARD_CODE["NUMPAD0"] = "Numpad0";
        KEYBOARD_CODE["NUMPAD_DECIMAL"] = "NumpadDecimal";
        KEYBOARD_CODE["PRINT_SCREEN"] = "PrintScreen";
        KEYBOARD_CODE["INTL_BACK_SLASH"] = "IntlBackSlash";
        KEYBOARD_CODE["F11"] = "F11";
        KEYBOARD_CODE["F12"] = "F12";
        KEYBOARD_CODE["NUMPAD_EQUAL"] = "NumpadEqual";
        KEYBOARD_CODE["F13"] = "F13";
        KEYBOARD_CODE["F14"] = "F14";
        KEYBOARD_CODE["F15"] = "F15";
        KEYBOARD_CODE["F16"] = "F16";
        KEYBOARD_CODE["F17"] = "F17";
        KEYBOARD_CODE["F18"] = "F18";
        KEYBOARD_CODE["F19"] = "F19";
        KEYBOARD_CODE["F20"] = "F20";
        KEYBOARD_CODE["F21"] = "F21";
        KEYBOARD_CODE["F22"] = "F22";
        KEYBOARD_CODE["F23"] = "F23";
        KEYBOARD_CODE["F24"] = "F24";
        KEYBOARD_CODE["KANA_MODE"] = "KanaMode";
        KEYBOARD_CODE["LANG2"] = "Lang2";
        KEYBOARD_CODE["LANG1"] = "Lang1";
        KEYBOARD_CODE["INTL_RO"] = "IntlRo";
        KEYBOARD_CODE["CONVERT"] = "Convert";
        KEYBOARD_CODE["NON_CONVERT"] = "NonConvert";
        KEYBOARD_CODE["INTL_YEN"] = "IntlYen";
        KEYBOARD_CODE["NUMPAD_COMMA"] = "NumpadComma";
        KEYBOARD_CODE["UNDO"] = "Undo";
        KEYBOARD_CODE["PASTE"] = "Paste";
        KEYBOARD_CODE["MEDIA_TRACK_PREVIOUS"] = "MediaTrackPrevious";
        KEYBOARD_CODE["CUT"] = "Cut";
        KEYBOARD_CODE["COPY"] = "Copy";
        KEYBOARD_CODE["MEDIA_TRACK_NEXT"] = "MediaTrackNext";
        KEYBOARD_CODE["NUMPAD_ENTER"] = "NumpadEnter";
        KEYBOARD_CODE["CTRL_RIGHT"] = "ControlRight";
        KEYBOARD_CODE["AUDIO_VOLUME_MUTE"] = "AudioVolumeMute";
        KEYBOARD_CODE["LAUNCH_APP2"] = "LaunchApp2";
        KEYBOARD_CODE["MEDIA_PLAY_PAUSE"] = "MediaPlayPause";
        KEYBOARD_CODE["MEDIA_STOP"] = "MediaStop";
        KEYBOARD_CODE["EJECT"] = "Eject";
        KEYBOARD_CODE["AUDIO_VOLUME_DOWN"] = "AudioVolumeDown";
        KEYBOARD_CODE["VOLUME_DOWN"] = "VolumeDown";
        KEYBOARD_CODE["AUDIO_VOLUME_UP"] = "AudioVolumeUp";
        KEYBOARD_CODE["VOLUME_UP"] = "VolumeUp";
        KEYBOARD_CODE["BROWSER_HOME"] = "BrowserHome";
        KEYBOARD_CODE["NUMPAD_DIVIDE"] = "NumpadDivide";
        KEYBOARD_CODE["ALT_RIGHT"] = "AltRight";
        KEYBOARD_CODE["HELP"] = "Help";
        KEYBOARD_CODE["NUM_LOCK"] = "NumLock";
        KEYBOARD_CODE["HOME"] = "Home";
        KEYBOARD_CODE["ARROW_UP"] = "ArrowUp";
        KEYBOARD_CODE["ARROW_RIGHT"] = "ArrowRight";
        KEYBOARD_CODE["ARROW_DOWN"] = "ArrowDown";
        KEYBOARD_CODE["ARROW_LEFT"] = "ArrowLeft";
        KEYBOARD_CODE["END"] = "End";
        KEYBOARD_CODE["PAGE_UP"] = "PageUp";
        KEYBOARD_CODE["PAGE_DOWN"] = "PageDown";
        KEYBOARD_CODE["INSERT"] = "Insert";
        KEYBOARD_CODE["DELETE"] = "Delete";
        KEYBOARD_CODE["META_LEFT"] = "Meta_Left";
        KEYBOARD_CODE["OS_LEFT"] = "OSLeft";
        KEYBOARD_CODE["META_RIGHT"] = "MetaRight";
        KEYBOARD_CODE["OS_RIGHT"] = "OSRight";
        KEYBOARD_CODE["CONTEXT_MENU"] = "ContextMenu";
        KEYBOARD_CODE["POWER"] = "Power";
        KEYBOARD_CODE["BROWSER_SEARCH"] = "BrowserSearch";
        KEYBOARD_CODE["BROWSER_FAVORITES"] = "BrowserFavorites";
        KEYBOARD_CODE["BROWSER_REFRESH"] = "BrowserRefresh";
        KEYBOARD_CODE["BROWSER_STOP"] = "BrowserStop";
        KEYBOARD_CODE["BROWSER_FORWARD"] = "BrowserForward";
        KEYBOARD_CODE["BROWSER_BACK"] = "BrowserBack";
        KEYBOARD_CODE["LAUNCH_APP1"] = "LaunchApp1";
        KEYBOARD_CODE["LAUNCH_MAIL"] = "LaunchMail";
        KEYBOARD_CODE["LAUNCH_MEDIA_PLAYER"] = "LaunchMediaPlayer";
        //mac brings this buttton
        KEYBOARD_CODE["FN"] = "Fn";
        //Linux brings these
        KEYBOARD_CODE["AGAIN"] = "Again";
        KEYBOARD_CODE["PROPS"] = "Props";
        KEYBOARD_CODE["SELECT"] = "Select";
        KEYBOARD_CODE["OPEN"] = "Open";
        KEYBOARD_CODE["FIND"] = "Find";
        KEYBOARD_CODE["WAKE_UP"] = "WakeUp";
        KEYBOARD_CODE["NUMPAD_PARENT_LEFT"] = "NumpadParentLeft";
        KEYBOARD_CODE["NUMPAD_PARENT_RIGHT"] = "NumpadParentRight";
        //android
        KEYBOARD_CODE["SLEEP"] = "Sleep";
    })(KEYBOARD_CODE = FudgeCore.KEYBOARD_CODE || (FudgeCore.KEYBOARD_CODE = {}));
    /*
    Firefox can't make use of those buttons and Combinations:
    SINGELE_BUTTONS:
     Druck,
    COMBINATIONS:
     Shift + F10, Shift + Numpad5,
     CTRL + q, CTRL + F4,
     ALT + F1, ALT + F2, ALT + F3, ALT + F7, ALT + F8, ALT + F10
    Opera won't do good with these Buttons and combinations:
    SINGLE_BUTTONS:
     Float32Array, F11, ALT,
    COMBINATIONS:
     CTRL + q, CTRL + t, CTRL + h, CTRL + g, CTRL + n, CTRL + f
     ALT + F1, ALT + F2, ALT + F4, ALT + F5, ALT + F6, ALT + F7, ALT + F8, ALT + F10
     */
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Framing describes how to map a rectangle into a given frame
     * and how points in the frame correspond to points in the resulting rectangle
     */
    class Framing extends FudgeCore.Mutable {
        reduceMutator(_mutator) { }
    }
    FudgeCore.Framing = Framing;
    /**
     * The resulting rectangle has a fixed width and height and display should scale to fit the frame
     * Points are scaled in the same ratio
     */
    class FramingFixed extends Framing {
        constructor() {
            super(...arguments);
            this.width = 300;
            this.height = 150;
        }
        setSize(_width, _height) {
            this.width = _width;
            this.height = _height;
        }
        getPoint(_pointInFrame, _rectFrame) {
            let result = new FudgeCore.Vector2(this.width * (_pointInFrame.x - _rectFrame.x) / _rectFrame.width, this.height * (_pointInFrame.y - _rectFrame.y) / _rectFrame.height);
            return result;
        }
        getPointInverse(_point, _rect) {
            let result = new FudgeCore.Vector2(_point.x * _rect.width / this.width + _rect.x, _point.y * _rect.height / this.height + _rect.y);
            return result;
        }
        getRect(_rectFrame) {
            return FudgeCore.Rectangle.GET(0, 0, this.width, this.height);
        }
    }
    FudgeCore.FramingFixed = FramingFixed;
    /**
     * Width and height of the resulting rectangle are fractions of those of the frame, scaled by normed values normWidth and normHeight.
     * Display should scale to fit the frame and points are scaled in the same ratio
     */
    class FramingScaled extends Framing {
        constructor() {
            super(...arguments);
            this.normWidth = 1.0;
            this.normHeight = 1.0;
        }
        setScale(_normWidth, _normHeight) {
            this.normWidth = _normWidth;
            this.normHeight = _normHeight;
        }
        getPoint(_pointInFrame, _rectFrame) {
            let result = new FudgeCore.Vector2(this.normWidth * (_pointInFrame.x - _rectFrame.x), this.normHeight * (_pointInFrame.y - _rectFrame.y));
            return result;
        }
        getPointInverse(_point, _rect) {
            let result = new FudgeCore.Vector2(_point.x / this.normWidth + _rect.x, _point.y / this.normHeight + _rect.y);
            return result;
        }
        getRect(_rectFrame) {
            return FudgeCore.Rectangle.GET(0, 0, this.normWidth * _rectFrame.width, this.normHeight * _rectFrame.height);
        }
    }
    FudgeCore.FramingScaled = FramingScaled;
    /**
     * The resulting rectangle fits into a margin given as fractions of the size of the frame given by normAnchor
     * plus an absolute padding given by pixelBorder. Display should fit into this.
     */
    class FramingComplex extends Framing {
        constructor() {
            super(...arguments);
            this.margin = { left: 0, top: 0, right: 0, bottom: 0 };
            this.padding = { left: 0, top: 0, right: 0, bottom: 0 };
        }
        getPoint(_pointInFrame, _rectFrame) {
            let result = new FudgeCore.Vector2(_pointInFrame.x - this.padding.left - this.margin.left * _rectFrame.width, _pointInFrame.y - this.padding.top - this.margin.top * _rectFrame.height);
            return result;
        }
        getPointInverse(_point, _rect) {
            let result = new FudgeCore.Vector2(_point.x + this.padding.left + this.margin.left * _rect.width, _point.y + this.padding.top + this.margin.top * _rect.height);
            return result;
        }
        getRect(_rectFrame) {
            if (!_rectFrame)
                return null;
            let minX = _rectFrame.x + this.margin.left * _rectFrame.width + this.padding.left;
            let minY = _rectFrame.y + this.margin.top * _rectFrame.height + this.padding.top;
            let maxX = _rectFrame.x + (1 - this.margin.right) * _rectFrame.width - this.padding.right;
            let maxY = _rectFrame.y + (1 - this.margin.bottom) * _rectFrame.height - this.padding.bottom;
            return FudgeCore.Rectangle.GET(minX, minY, maxX - minX, maxY - minY);
        }
        getMutator() {
            return { margin: this.margin, padding: this.padding };
        }
    }
    FudgeCore.FramingComplex = FramingComplex;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Simple class for 3x3 matrix operations (This class can only handle 2D
     * transformations. Could be removed after applying full 2D compatibility to Mat4).
     * @authors Jascha Karagöl, HFU, 2019 | Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class Matrix3x3 {
        constructor() {
            this.data = [
                1, 0, 0,
                0, 1, 0,
                0, 0, 1
            ];
        }
        static projection(_width, _height) {
            let matrix = new Matrix3x3;
            matrix.data = [
                2 / _width, 0, 0,
                0, -2 / _height, 0,
                -1, 1, 1
            ];
            return matrix;
        }
        get Data() {
            return this.data;
        }
        identity() {
            return new Matrix3x3;
        }
        translate(_matrix, _xTranslation, _yTranslation) {
            return this.multiply(_matrix, this.translation(_xTranslation, _yTranslation));
        }
        rotate(_matrix, _angleInDegrees) {
            return this.multiply(_matrix, this.rotation(_angleInDegrees));
        }
        scale(_matrix, _xScale, _yscale) {
            return this.multiply(_matrix, this.scaling(_xScale, _yscale));
        }
        multiply(_a, _b) {
            let a00 = _a.data[0 * 3 + 0];
            let a01 = _a.data[0 * 3 + 1];
            let a02 = _a.data[0 * 3 + 2];
            let a10 = _a.data[1 * 3 + 0];
            let a11 = _a.data[1 * 3 + 1];
            let a12 = _a.data[1 * 3 + 2];
            let a20 = _a.data[2 * 3 + 0];
            let a21 = _a.data[2 * 3 + 1];
            let a22 = _a.data[2 * 3 + 2];
            let b00 = _b.data[0 * 3 + 0];
            let b01 = _b.data[0 * 3 + 1];
            let b02 = _b.data[0 * 3 + 2];
            let b10 = _b.data[1 * 3 + 0];
            let b11 = _b.data[1 * 3 + 1];
            let b12 = _b.data[1 * 3 + 2];
            let b20 = _b.data[2 * 3 + 0];
            let b21 = _b.data[2 * 3 + 1];
            let b22 = _b.data[2 * 3 + 2];
            let matrix = new Matrix3x3;
            matrix.data = [
                b00 * a00 + b01 * a10 + b02 * a20,
                b00 * a01 + b01 * a11 + b02 * a21,
                b00 * a02 + b01 * a12 + b02 * a22,
                b10 * a00 + b11 * a10 + b12 * a20,
                b10 * a01 + b11 * a11 + b12 * a21,
                b10 * a02 + b11 * a12 + b12 * a22,
                b20 * a00 + b21 * a10 + b22 * a20,
                b20 * a01 + b21 * a11 + b22 * a21,
                b20 * a02 + b21 * a12 + b22 * a22
            ];
            return matrix;
        }
        translation(_xTranslation, _yTranslation) {
            let matrix = new Matrix3x3;
            matrix.data = [
                1, 0, 0,
                0, 1, 0,
                _xTranslation, _yTranslation, 1
            ];
            return matrix;
        }
        scaling(_xScale, _yScale) {
            let matrix = new Matrix3x3;
            matrix.data = [
                _xScale, 0, 0,
                0, _yScale, 0,
                0, 0, 1
            ];
            return matrix;
        }
        rotation(_angleInDegrees) {
            let angleInDegrees = 360 - _angleInDegrees;
            let angleInRadians = angleInDegrees * Math.PI / 180;
            let sin = Math.sin(angleInRadians);
            let cos = Math.cos(angleInRadians);
            let matrix = new Matrix3x3;
            matrix.data = [
                cos, -sin, 0,
                sin, cos, 0,
                0, 0, 1
            ];
            return matrix;
        }
    }
    FudgeCore.Matrix3x3 = Matrix3x3;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Stores a 4x4 transformation matrix and provides operations for it.
     * ```plaintext
     * [ 0, 1, 2, 3 ] ← row vector x
     * [ 4, 5, 6, 7 ] ← row vector y
     * [ 8, 9,10,11 ] ← row vector z
     * [12,13,14,15 ] ← translation
     *            ↑  homogeneous column
     * ```
     * @authors Jascha Karagöl, HFU, 2019 | Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class Matrix4x4 extends FudgeCore.Mutable {
        constructor() {
            super();
            this.data = new Float32Array(16); // The data of the matrix.
            this.mutator = null; // prepared for optimization, keep mutator to reduce redundant calculation and for comparison. Set to null when data changes!
            this.data.set([
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1
            ]);
            this.resetCache();
        }
        /**
         * - get: a copy of the calculated translation vector
         * - set: effect the matrix ignoring its rotation and scaling
         */
        get translation() {
            if (!this.vectors.translation)
                this.vectors.translation = new FudgeCore.Vector3(this.data[12], this.data[13], this.data[14]);
            return this.vectors.translation.copy;
        }
        set translation(_translation) {
            this.data.set(_translation.get(), 12);
            // no full cache reset required
            this.vectors.translation = _translation;
            this.mutator = null;
        }
        /**
         * - get: a copy of the calculated rotation vector
         * - set: effect the matrix
         */
        get rotation() {
            if (!this.vectors.rotation)
                this.vectors.rotation = this.getEulerAngles();
            return this.vectors.rotation.copy;
        }
        set rotation(_rotation) {
            this.mutate({ "rotation": _rotation });
            this.resetCache();
        }
        /**
         * - get: a copy of the calculated scale vector
         * - set: effect the matrix
         */
        get scaling() {
            if (!this.vectors.scaling)
                this.vectors.scaling = new FudgeCore.Vector3(Math.hypot(this.data[0], this.data[1], this.data[2]), Math.hypot(this.data[4], this.data[5], this.data[6]), Math.hypot(this.data[8], this.data[9], this.data[10]));
            return this.vectors.scaling.copy;
        }
        set scaling(_scaling) {
            this.mutate({ "scaling": _scaling });
            this.resetCache();
        }
        //#region STATICS
        /**
         * Retrieve a new identity matrix
         */
        static get IDENTITY() {
            // const result: Matrix4x4 = new Matrix4x4();
            const result = FudgeCore.Recycler.get(Matrix4x4);
            result.data.set([
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1
            ]);
            return result;
        }
        /**
         * Computes and returns the product of two passed matrices.
         * @param _a The matrix to multiply.
         * @param _b The matrix to multiply by.
         */
        static MULTIPLICATION(_a, _b) {
            let a = _a.data;
            let b = _b.data;
            // let matrix: Matrix4x4 = new Matrix4x4();
            const matrix = FudgeCore.Recycler.get(Matrix4x4);
            let a00 = a[0 * 4 + 0];
            let a01 = a[0 * 4 + 1];
            let a02 = a[0 * 4 + 2];
            let a03 = a[0 * 4 + 3];
            let a10 = a[1 * 4 + 0];
            let a11 = a[1 * 4 + 1];
            let a12 = a[1 * 4 + 2];
            let a13 = a[1 * 4 + 3];
            let a20 = a[2 * 4 + 0];
            let a21 = a[2 * 4 + 1];
            let a22 = a[2 * 4 + 2];
            let a23 = a[2 * 4 + 3];
            let a30 = a[3 * 4 + 0];
            let a31 = a[3 * 4 + 1];
            let a32 = a[3 * 4 + 2];
            let a33 = a[3 * 4 + 3];
            let b00 = b[0 * 4 + 0];
            let b01 = b[0 * 4 + 1];
            let b02 = b[0 * 4 + 2];
            let b03 = b[0 * 4 + 3];
            let b10 = b[1 * 4 + 0];
            let b11 = b[1 * 4 + 1];
            let b12 = b[1 * 4 + 2];
            let b13 = b[1 * 4 + 3];
            let b20 = b[2 * 4 + 0];
            let b21 = b[2 * 4 + 1];
            let b22 = b[2 * 4 + 2];
            let b23 = b[2 * 4 + 3];
            let b30 = b[3 * 4 + 0];
            let b31 = b[3 * 4 + 1];
            let b32 = b[3 * 4 + 2];
            let b33 = b[3 * 4 + 3];
            matrix.data.set([
                b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30,
                b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31,
                b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32,
                b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33,
                b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30,
                b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31,
                b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32,
                b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33,
                b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30,
                b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31,
                b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32,
                b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33,
                b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30,
                b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31,
                b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32,
                b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33
            ]);
            return matrix;
        }
        /**
         * Computes and returns the inverse of a passed matrix.
         * @param _matrix The matrix to compute the inverse of.
         */
        static INVERSION(_matrix) {
            let m = _matrix.data;
            let m00 = m[0 * 4 + 0];
            let m01 = m[0 * 4 + 1];
            let m02 = m[0 * 4 + 2];
            let m03 = m[0 * 4 + 3];
            let m10 = m[1 * 4 + 0];
            let m11 = m[1 * 4 + 1];
            let m12 = m[1 * 4 + 2];
            let m13 = m[1 * 4 + 3];
            let m20 = m[2 * 4 + 0];
            let m21 = m[2 * 4 + 1];
            let m22 = m[2 * 4 + 2];
            let m23 = m[2 * 4 + 3];
            let m30 = m[3 * 4 + 0];
            let m31 = m[3 * 4 + 1];
            let m32 = m[3 * 4 + 2];
            let m33 = m[3 * 4 + 3];
            let tmp0 = m22 * m33;
            let tmp1 = m32 * m23;
            let tmp2 = m12 * m33;
            let tmp3 = m32 * m13;
            let tmp4 = m12 * m23;
            let tmp5 = m22 * m13;
            let tmp6 = m02 * m33;
            let tmp7 = m32 * m03;
            let tmp8 = m02 * m23;
            let tmp9 = m22 * m03;
            let tmp10 = m02 * m13;
            let tmp11 = m12 * m03;
            let tmp12 = m20 * m31;
            let tmp13 = m30 * m21;
            let tmp14 = m10 * m31;
            let tmp15 = m30 * m11;
            let tmp16 = m10 * m21;
            let tmp17 = m20 * m11;
            let tmp18 = m00 * m31;
            let tmp19 = m30 * m01;
            let tmp20 = m00 * m21;
            let tmp21 = m20 * m01;
            let tmp22 = m00 * m11;
            let tmp23 = m10 * m01;
            let t0 = (tmp0 * m11 + tmp3 * m21 + tmp4 * m31) -
                (tmp1 * m11 + tmp2 * m21 + tmp5 * m31);
            let t1 = (tmp1 * m01 + tmp6 * m21 + tmp9 * m31) -
                (tmp0 * m01 + tmp7 * m21 + tmp8 * m31);
            let t2 = (tmp2 * m01 + tmp7 * m11 + tmp10 * m31) -
                (tmp3 * m01 + tmp6 * m11 + tmp11 * m31);
            let t3 = (tmp5 * m01 + tmp8 * m11 + tmp11 * m21) -
                (tmp4 * m01 + tmp9 * m11 + tmp10 * m21);
            let d = 1.0 / (m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3);
            // let matrix: Matrix4x4 = new Matrix4x4;
            const matrix = FudgeCore.Recycler.get(Matrix4x4);
            matrix.data.set([
                d * t0,
                d * t1,
                d * t2,
                d * t3,
                d * ((tmp1 * m10 + tmp2 * m20 + tmp5 * m30) - (tmp0 * m10 + tmp3 * m20 + tmp4 * m30)),
                d * ((tmp0 * m00 + tmp7 * m20 + tmp8 * m30) - (tmp1 * m00 + tmp6 * m20 + tmp9 * m30)),
                d * ((tmp3 * m00 + tmp6 * m10 + tmp11 * m30) - (tmp2 * m00 + tmp7 * m10 + tmp10 * m30)),
                d * ((tmp4 * m00 + tmp9 * m10 + tmp10 * m20) - (tmp5 * m00 + tmp8 * m10 + tmp11 * m20)),
                d * ((tmp12 * m13 + tmp15 * m23 + tmp16 * m33) - (tmp13 * m13 + tmp14 * m23 + tmp17 * m33)),
                d * ((tmp13 * m03 + tmp18 * m23 + tmp21 * m33) - (tmp12 * m03 + tmp19 * m23 + tmp20 * m33)),
                d * ((tmp14 * m03 + tmp19 * m13 + tmp22 * m33) - (tmp15 * m03 + tmp18 * m13 + tmp23 * m33)),
                d * ((tmp17 * m03 + tmp20 * m13 + tmp23 * m23) - (tmp16 * m03 + tmp21 * m13 + tmp22 * m23)),
                d * ((tmp14 * m22 + tmp17 * m32 + tmp13 * m12) - (tmp16 * m32 + tmp12 * m12 + tmp15 * m22)),
                d * ((tmp20 * m32 + tmp12 * m02 + tmp19 * m22) - (tmp18 * m22 + tmp21 * m32 + tmp13 * m02)),
                d * ((tmp18 * m12 + tmp23 * m32 + tmp15 * m02) - (tmp22 * m32 + tmp14 * m02 + tmp19 * m12)),
                d * ((tmp22 * m22 + tmp16 * m02 + tmp21 * m12) - (tmp20 * m12 + tmp23 * m22 + tmp17 * m02)) // [15]
            ]);
            return matrix;
        }
        /**
         * Computes and returns a rotationmatrix that aligns a transformations z-axis with the vector between it and its target.
         * @param _transformPosition The x,y and z-coordinates of the object to rotate.
         * @param _targetPosition The position to look at.
         */
        static LOOK_AT(_transformPosition, _targetPosition, _up = FudgeCore.Vector3.Y()) {
            // const matrix: Matrix4x4 = new Matrix4x4;
            const matrix = FudgeCore.Recycler.get(Matrix4x4);
            let zAxis = FudgeCore.Vector3.DIFFERENCE(_transformPosition, _targetPosition);
            zAxis.normalize();
            let xAxis = FudgeCore.Vector3.NORMALIZATION(FudgeCore.Vector3.CROSS(_up, zAxis));
            let yAxis = FudgeCore.Vector3.NORMALIZATION(FudgeCore.Vector3.CROSS(zAxis, xAxis));
            matrix.data.set([
                xAxis.x, xAxis.y, xAxis.z, 0,
                yAxis.x, yAxis.y, yAxis.z, 0,
                zAxis.x, zAxis.y, zAxis.z, 0,
                _transformPosition.x,
                _transformPosition.y,
                _transformPosition.z,
                1
            ]);
            return matrix;
        }
        /**
         * Returns a matrix that translates coordinates along the x-, y- and z-axis according to the given vector.
         */
        static TRANSLATION(_translate) {
            // let matrix: Matrix4x4 = new Matrix4x4;
            const matrix = FudgeCore.Recycler.get(Matrix4x4);
            matrix.data.set([
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                _translate.x, _translate.y, _translate.z, 1
            ]);
            return matrix;
        }
        /**
         * Returns a matrix that rotates coordinates on the x-axis when multiplied by.
         * @param _angleInDegrees The value of the rotation.
         */
        static ROTATION_X(_angleInDegrees) {
            // const matrix: Matrix4x4 = new Matrix4x4;
            const matrix = FudgeCore.Recycler.get(Matrix4x4);
            let angleInRadians = _angleInDegrees * Math.PI / 180;
            let sin = Math.sin(angleInRadians);
            let cos = Math.cos(angleInRadians);
            matrix.data.set([
                1, 0, 0, 0,
                0, cos, sin, 0,
                0, -sin, cos, 0,
                0, 0, 0, 1
            ]);
            return matrix;
        }
        /**
         * Returns a matrix that rotates coordinates on the y-axis when multiplied by.
         * @param _angleInDegrees The value of the rotation.
         */
        static ROTATION_Y(_angleInDegrees) {
            // const matrix: Matrix4x4 = new Matrix4x4;
            let matrix = FudgeCore.Recycler.get(Matrix4x4);
            let angleInRadians = _angleInDegrees * Math.PI / 180;
            let sin = Math.sin(angleInRadians);
            let cos = Math.cos(angleInRadians);
            matrix.data.set([
                cos, 0, -sin, 0,
                0, 1, 0, 0,
                sin, 0, cos, 0,
                0, 0, 0, 1
            ]);
            return matrix;
        }
        /**
         * Returns a matrix that rotates coordinates on the z-axis when multiplied by.
         * @param _angleInDegrees The value of the rotation.
         */
        static ROTATION_Z(_angleInDegrees) {
            // const matrix: Matrix4x4 = new Matrix4x4;
            const matrix = FudgeCore.Recycler.get(Matrix4x4);
            let angleInRadians = _angleInDegrees * Math.PI / 180;
            let sin = Math.sin(angleInRadians);
            let cos = Math.cos(angleInRadians);
            matrix.data.set([
                cos, sin, 0, 0,
                -sin, cos, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1
            ]);
            return matrix;
        }
        /**
         * Returns a matrix that scales coordinates along the x-, y- and z-axis according to the given vector
         */
        static SCALING(_scalar) {
            // const matrix: Matrix4x4 = new Matrix4x4;
            const matrix = FudgeCore.Recycler.get(Matrix4x4);
            matrix.data.set([
                _scalar.x, 0, 0, 0,
                0, _scalar.y, 0, 0,
                0, 0, _scalar.z, 0,
                0, 0, 0, 1
            ]);
            return matrix;
        }
        //#endregion
        //#region PROJECTIONS
        /**
         * Computes and returns a matrix that applies perspective to an object, if its transform is multiplied by it.
         * @param _aspect The aspect ratio between width and height of projectionspace.(Default = canvas.clientWidth / canvas.ClientHeight)
         * @param _fieldOfViewInDegrees The field of view in Degrees. (Default = 45)
         * @param _near The near clipspace border on the z-axis.
         * @param _far The far clipspace border on the z-axis.
         * @param _direction The plane on which the fieldOfView-Angle is given
         */
        static PROJECTION_CENTRAL(_aspect, _fieldOfViewInDegrees, _near, _far, _direction) {
            let fieldOfViewInRadians = _fieldOfViewInDegrees * Math.PI / 180;
            let f = Math.tan(0.5 * (Math.PI - fieldOfViewInRadians));
            let rangeInv = 1.0 / (_near - _far);
            // const matrix: Matrix4x4 = new Matrix4x4;
            const matrix = FudgeCore.Recycler.get(Matrix4x4);
            matrix.data.set([
                f, 0, 0, 0,
                0, f, 0, 0,
                0, 0, (_near + _far) * rangeInv, -1,
                0, 0, _near * _far * rangeInv * 2, 0
            ]);
            if (_direction == FudgeCore.FIELD_OF_VIEW.DIAGONAL) {
                _aspect = Math.sqrt(_aspect);
                matrix.data[0] = f / _aspect;
                matrix.data[5] = f * _aspect;
            }
            else if (_direction == FudgeCore.FIELD_OF_VIEW.VERTICAL)
                matrix.data[0] = f / _aspect;
            else //FOV_DIRECTION.HORIZONTAL
                matrix.data[5] = f * _aspect;
            return matrix;
        }
        /**
         * Computes and returns a matrix that applies orthographic projection to an object, if its transform is multiplied by it.
         * @param _left The positionvalue of the projectionspace's left border.
         * @param _right The positionvalue of the projectionspace's right border.
         * @param _bottom The positionvalue of the projectionspace's bottom border.
         * @param _top The positionvalue of the projectionspace's top border.
         * @param _near The positionvalue of the projectionspace's near border.
         * @param _far The positionvalue of the projectionspace's far border
         */
        static PROJECTION_ORTHOGRAPHIC(_left, _right, _bottom, _top, _near = -400, _far = 400) {
            // const matrix: Matrix4x4 = new Matrix4x4;
            const matrix = FudgeCore.Recycler.get(Matrix4x4);
            matrix.data.set([
                2 / (_right - _left), 0, 0, 0,
                0, 2 / (_top - _bottom), 0, 0,
                0, 0, 2 / (_near - _far), 0,
                (_left + _right) / (_left - _right),
                (_bottom + _top) / (_bottom - _top),
                (_near + _far) / (_near - _far),
                1
            ]);
            return matrix;
        }
        //#endregion
        //#region Rotation
        /**
         * Rotate this matrix by given vector in the order Z, Y, X. Right hand rotation is used, thumb points in axis direction, fingers curling indicate rotation
         * @param _by
         */
        rotate(_by) {
            this.rotateZ(_by.z);
            this.rotateY(_by.y);
            this.rotateX(_by.x);
        }
        /**
         * Adds a rotation around the x-Axis to this matrix
         */
        rotateX(_angleInDegrees) {
            const matrix = Matrix4x4.MULTIPLICATION(this, Matrix4x4.ROTATION_X(_angleInDegrees));
            this.set(matrix);
            FudgeCore.Recycler.store(matrix);
        }
        /**
         * Adds a rotation around the y-Axis to this matrix
         */
        rotateY(_angleInDegrees) {
            const matrix = Matrix4x4.MULTIPLICATION(this, Matrix4x4.ROTATION_Y(_angleInDegrees));
            this.set(matrix);
            FudgeCore.Recycler.store(matrix);
        }
        /**
         * Adds a rotation around the z-Axis to this matrix
         */
        rotateZ(_angleInDegrees) {
            const matrix = Matrix4x4.MULTIPLICATION(this, Matrix4x4.ROTATION_Z(_angleInDegrees));
            this.set(matrix);
            FudgeCore.Recycler.store(matrix);
        }
        /**
         * Adjusts the rotation of this matrix to face the given target and tilts it to accord with the given up vector
         */
        lookAt(_target, _up = FudgeCore.Vector3.Y()) {
            const matrix = Matrix4x4.LOOK_AT(this.translation, _target); // TODO: Handle rotation around z-axis
            this.set(matrix);
            FudgeCore.Recycler.store(matrix);
        }
        //#endregion
        //#region Translation
        /**
         * Add a translation by the given vector to this matrix
         */
        translate(_by) {
            const matrix = Matrix4x4.MULTIPLICATION(this, Matrix4x4.TRANSLATION(_by));
            // TODO: possible optimization, translation may alter mutator instead of deleting it.
            this.set(matrix);
            FudgeCore.Recycler.store(matrix);
        }
        /**
         * Add a translation along the x-Axis by the given amount to this matrix
         */
        translateX(_x) {
            this.data[12] += _x;
            this.mutator = null;
        }
        /**
         * Add a translation along the y-Axis by the given amount to this matrix
         */
        translateY(_y) {
            this.data[13] += _y;
            this.mutator = null;
        }
        /**
         * Add a translation along the y-Axis by the given amount to this matrix
         */
        translateZ(_z) {
            this.data[14] += _z;
            this.mutator = null;
        }
        //#endregion
        //#region Scaling
        /**
         * Add a scaling by the given vector to this matrix
         */
        scale(_by) {
            const matrix = Matrix4x4.MULTIPLICATION(this, Matrix4x4.SCALING(_by));
            this.set(matrix);
            FudgeCore.Recycler.store(matrix);
        }
        /**
         * Add a scaling along the x-Axis by the given amount to this matrix
         */
        scaleX(_by) {
            this.scale(new FudgeCore.Vector3(_by, 1, 1));
        }
        /**
         * Add a scaling along the y-Axis by the given amount to this matrix
         */
        scaleY(_by) {
            this.scale(new FudgeCore.Vector3(1, _by, 1));
        }
        /**
         * Add a scaling along the z-Axis by the given amount to this matrix
         */
        scaleZ(_by) {
            this.scale(new FudgeCore.Vector3(1, 1, _by));
        }
        //#endregion
        //#region Transformation
        /**
         * Multiply this matrix with the given matrix
         */
        multiply(_matrix) {
            this.set(Matrix4x4.MULTIPLICATION(this, _matrix));
            this.mutator = null;
        }
        //#endregion
        //#region Transfer
        /**
         * Calculates and returns the euler-angles representing the current rotation of this matrix
         */
        getEulerAngles() {
            let scaling = this.scaling;
            let s0 = this.data[0] / scaling.x;
            let s1 = this.data[1] / scaling.x;
            let s2 = this.data[2] / scaling.x;
            let s6 = this.data[6] / scaling.y;
            let s10 = this.data[10] / scaling.z;
            let sy = Math.hypot(s0, s1); // probably 2. param should be this.data[4] / scaling.y
            let singular = sy < 1e-6; // If
            let x1, y1, z1;
            let x2, y2, z2;
            if (!singular) {
                x1 = Math.atan2(s6, s10);
                y1 = Math.atan2(-s2, sy);
                z1 = Math.atan2(s1, s0);
                x2 = Math.atan2(-s6, -s10);
                y2 = Math.atan2(-s2, -sy);
                z2 = Math.atan2(-s1, -s0);
                if (Math.abs(x2) + Math.abs(y2) + Math.abs(z2) < Math.abs(x1) + Math.abs(y1) + Math.abs(z1)) {
                    x1 = x2;
                    y1 = y2;
                    z1 = z2;
                }
            }
            else {
                x1 = Math.atan2(-this.data[9] / scaling.z, this.data[5] / scaling.y);
                y1 = Math.atan2(-this.data[2] / scaling.x, sy);
                z1 = 0;
            }
            let rotation = new FudgeCore.Vector3(x1, y1, z1);
            rotation.scale(180 / Math.PI);
            return rotation;
        }
        /**
         * Sets the elements of this matrix to the values of the given matrix
         */
        set(_to) {
            // this.data = _to.get();
            this.data.set(_to.data);
            this.resetCache();
        }
        /**
         * Return the elements of this matrix as a Float32Array
         */
        get() {
            return new Float32Array(this.data);
        }
        serialize() {
            // TODO: save translation, rotation and scale as vectors for readability and manipulation
            let serialization = this.getMutator();
            return serialization;
        }
        deserialize(_serialization) {
            this.mutate(_serialization);
            return this;
        }
        getMutator() {
            if (this.mutator)
                return this.mutator;
            let mutator = {
                translation: this.translation.getMutator(),
                rotation: this.rotation.getMutator(),
                scaling: this.scaling.getMutator()
            };
            // cache mutator
            this.mutator = mutator;
            return mutator;
        }
        mutate(_mutator) {
            let oldTranslation = this.translation;
            let oldRotation = this.rotation;
            let oldScaling = this.scaling;
            let newTranslation = _mutator["translation"];
            let newRotation = _mutator["rotation"];
            let newScaling = _mutator["scaling"];
            let vectors = { translation: oldTranslation, rotation: oldRotation, scaling: oldScaling };
            if (newTranslation) {
                vectors.translation = new FudgeCore.Vector3(newTranslation.x != undefined ? newTranslation.x : oldTranslation.x, newTranslation.y != undefined ? newTranslation.y : oldTranslation.y, newTranslation.z != undefined ? newTranslation.z : oldTranslation.z);
            }
            if (newRotation) {
                vectors.rotation = new FudgeCore.Vector3(newRotation.x != undefined ? newRotation.x : oldRotation.x, newRotation.y != undefined ? newRotation.y : oldRotation.y, newRotation.z != undefined ? newRotation.z : oldRotation.z);
            }
            if (newScaling) {
                vectors.scaling = new FudgeCore.Vector3(newScaling.x != undefined ? newScaling.x : oldScaling.x, newScaling.y != undefined ? newScaling.y : oldScaling.y, newScaling.z != undefined ? newScaling.z : oldScaling.z);
            }
            // TODO: possible performance optimization when only one or two components change, then use old matrix instead of IDENTITY and transform by differences/quotients
            let matrix = Matrix4x4.IDENTITY;
            if (vectors.translation)
                matrix.translate(vectors.translation);
            if (vectors.rotation) {
                matrix.rotateZ(vectors.rotation.z);
                matrix.rotateY(vectors.rotation.y);
                matrix.rotateX(vectors.rotation.x);
            }
            if (vectors.scaling)
                matrix.scale(vectors.scaling);
            this.set(matrix);
            this.vectors = vectors;
        }
        getMutatorAttributeTypes(_mutator) {
            let types = {};
            if (_mutator.translation)
                types.translation = "Vector3";
            if (_mutator.rotation)
                types.rotation = "Vector3";
            if (_mutator.scaling)
                types.scaling = "Vector3";
            return types;
        }
        reduceMutator(_mutator) { }
        resetCache() {
            this.vectors = { translation: null, rotation: null, scaling: null };
            this.mutator = null;
        }
    }
    FudgeCore.Matrix4x4 = Matrix4x4;
    //#endregion
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Defines the origin of a rectangle
     */
    let ORIGIN2D;
    (function (ORIGIN2D) {
        ORIGIN2D[ORIGIN2D["TOPLEFT"] = 0] = "TOPLEFT";
        ORIGIN2D[ORIGIN2D["TOPCENTER"] = 1] = "TOPCENTER";
        ORIGIN2D[ORIGIN2D["TOPRIGHT"] = 2] = "TOPRIGHT";
        ORIGIN2D[ORIGIN2D["CENTERLEFT"] = 16] = "CENTERLEFT";
        ORIGIN2D[ORIGIN2D["CENTER"] = 17] = "CENTER";
        ORIGIN2D[ORIGIN2D["CENTERRIGHT"] = 18] = "CENTERRIGHT";
        ORIGIN2D[ORIGIN2D["BOTTOMLEFT"] = 32] = "BOTTOMLEFT";
        ORIGIN2D[ORIGIN2D["BOTTOMCENTER"] = 33] = "BOTTOMCENTER";
        ORIGIN2D[ORIGIN2D["BOTTOMRIGHT"] = 34] = "BOTTOMRIGHT";
    })(ORIGIN2D = FudgeCore.ORIGIN2D || (FudgeCore.ORIGIN2D = {}));
    /**
     * Defines a rectangle with position and size and add comfortable methods to it
     * @author Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class Rectangle extends FudgeCore.Mutable {
        constructor(_x = 0, _y = 0, _width = 1, _height = 1, _origin = ORIGIN2D.TOPLEFT) {
            super();
            this.position = FudgeCore.Recycler.get(FudgeCore.Vector2);
            this.size = FudgeCore.Recycler.get(FudgeCore.Vector2);
            this.setPositionAndSize(_x, _y, _width, _height, _origin);
        }
        /**
         * Returns a new rectangle created with the given parameters
         */
        static GET(_x = 0, _y = 0, _width = 1, _height = 1, _origin = ORIGIN2D.TOPLEFT) {
            let rect = FudgeCore.Recycler.get(Rectangle);
            rect.setPositionAndSize(_x, _y, _width, _height);
            return rect;
        }
        /**
         * Sets the position and size of the rectangle according to the given parameters
         */
        setPositionAndSize(_x = 0, _y = 0, _width = 1, _height = 1, _origin = ORIGIN2D.TOPLEFT) {
            this.size.set(_width, _height);
            switch (_origin & 0x03) {
                case 0x00:
                    this.position.x = _x;
                    break;
                case 0x01:
                    this.position.x = _x - _width / 2;
                    break;
                case 0x02:
                    this.position.x = _x - _width;
                    break;
            }
            switch (_origin & 0x30) {
                case 0x00:
                    this.position.y = _y;
                    break;
                case 0x10:
                    this.position.y = _y - _height / 2;
                    break;
                case 0x20:
                    this.position.y = _y - _height;
                    break;
            }
        }
        get x() {
            return this.position.x;
        }
        get y() {
            return this.position.y;
        }
        get width() {
            return this.size.x;
        }
        get height() {
            return this.size.y;
        }
        get left() {
            return this.position.x;
        }
        get top() {
            return this.position.y;
        }
        get right() {
            return this.position.x + this.size.x;
        }
        get bottom() {
            return this.position.y + this.size.y;
        }
        set x(_x) {
            this.position.x = _x;
        }
        set y(_y) {
            this.position.y = _y;
        }
        set width(_width) {
            this.position.x = _width;
        }
        set height(_height) {
            this.position.y = _height;
        }
        set left(_value) {
            this.size.x = this.right - _value;
            this.position.x = _value;
        }
        set top(_value) {
            this.size.y = this.bottom - _value;
            this.position.y = _value;
        }
        set right(_value) {
            this.size.x = this.position.x + _value;
        }
        set bottom(_value) {
            this.size.y = this.position.y + _value;
        }
        /**
         * Returns true if the given point is inside of this rectangle or on the border
         * @param _point
         */
        isInside(_point) {
            return (_point.x >= this.left && _point.x <= this.right && _point.y >= this.top && _point.y <= this.bottom);
        }
        reduceMutator(_mutator) { }
    }
    FudgeCore.Rectangle = Rectangle;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Stores and manipulates a twodimensional vector comprised of the components x and y
     * ```plaintext
     *            +y
     *             |__ +x
     * ```
     * @authors Lukas Scheuerle, HFU, 2019
     */
    class Vector2 extends FudgeCore.Mutable {
        constructor(_x = 0, _y = 0) {
            super();
            this.data = new Float32Array([_x, _y]);
        }
        get x() {
            return this.data[0];
        }
        get y() {
            return this.data[1];
        }
        set x(_x) {
            this.data[0] = _x;
        }
        set y(_y) {
            this.data[1] = _y;
        }
        /**
         * A shorthand for writing `new Vector2(0, 0)`.
         * @returns A new vector with the values (0, 0)
         */
        static ZERO() {
            let vector = new Vector2();
            return vector;
        }
        /**
         * A shorthand for writing `new Vector2(_scale, _scale)`.
         * @param _scale the scale of the vector. Default: 1
         */
        static ONE(_scale = 1) {
            let vector = new Vector2(_scale, _scale);
            return vector;
        }
        /**
         * A shorthand for writing `new Vector2(0, y)`.
         * @param _scale The number to write in the y coordinate. Default: 1
         * @returns A new vector with the values (0, _scale)
         */
        static Y(_scale = 1) {
            let vector = new Vector2(0, _scale);
            return vector;
        }
        /**
         * A shorthand for writing `new Vector2(x, 0)`.
         * @param _scale The number to write in the x coordinate. Default: 1
         * @returns A new vector with the values (_scale, 0)
         */
        static X(_scale = 1) {
            let vector = new Vector2(_scale, 0);
            return vector;
        }
        /**
         * Normalizes a given vector to the given length without editing the original vector.
         * @param _vector the vector to normalize
         * @param _length the length of the resulting vector. defaults to 1
         * @returns a new vector representing the normalised vector scaled by the given length
         */
        static NORMALIZATION(_vector, _length = 1) {
            let vector = Vector2.ZERO();
            try {
                let [x, y] = _vector.data;
                let factor = _length / Math.hypot(x, y);
                vector.data = new Float32Array([_vector.x * factor, _vector.y * factor]);
            }
            catch (_e) {
                console.warn(_e);
            }
            return vector;
        }
        /**
         * Scales a given vector by a given scale without changing the original vector
         * @param _vector The vector to scale.
         * @param _scale The scale to scale with.
         * @returns A new vector representing the scaled version of the given vector
         */
        static SCALE(_vector, _scale) {
            let vector = new Vector2();
            return vector;
        }
        /**
         * Sums up multiple vectors.
         * @param _vectors A series of vectors to sum up
         * @returns A new vector representing the sum of the given vectors
         */
        static SUM(..._vectors) {
            let result = new Vector2();
            for (let vector of _vectors)
                result.data = new Float32Array([result.x + vector.x, result.y + vector.y]);
            return result;
        }
        /**
         * Subtracts two vectors.
         * @param _a The vector to subtract from.
         * @param _b The vector to subtract.
         * @returns A new vector representing the difference of the given vectors
         */
        static DIFFERENCE(_a, _b) {
            let vector = new Vector2;
            vector.data = new Float32Array([_a.x - _b.x, _a.y - _b.y]);
            return vector;
        }
        /**
         * Computes the dotproduct of 2 vectors.
         * @param _a The vector to multiply.
         * @param _b The vector to multiply by.
         * @returns A new vector representing the dotproduct of the given vectors
         */
        static DOT(_a, _b) {
            let scalarProduct = _a.x * _b.x + _a.y * _b.y;
            return scalarProduct;
        }
        /**
         * Returns the magnitude of a given vector.
         * If you only need to compare magnitudes of different vectors, you can compare squared magnitudes using Vector2.MAGNITUDESQR instead.
         * @see Vector2.MAGNITUDESQR
         * @param _vector The vector to get the magnitude of.
         * @returns A number representing the magnitude of the given vector.
         */
        static MAGNITUDE(_vector) {
            let magnitude = Math.sqrt(Vector2.MAGNITUDESQR(_vector));
            return magnitude;
        }
        /**
         * Returns the squared magnitude of a given vector. Much less calculation intensive than Vector2.MAGNITUDE, should be used instead if possible.
         * @param _vector The vector to get the squared magnitude of.
         * @returns A number representing the squared magnitude of the given vector.
         */
        static MAGNITUDESQR(_vector) {
            let magnitude = Vector2.DOT(_vector, _vector);
            return magnitude;
        }
        /**
         * Calculates the cross product of two Vectors. Due to them being only 2 Dimensional, the result is a single number,
         * which implicitly is on the Z axis. It is also the signed magnitude of the result.
         * @param _a Vector to compute the cross product on
         * @param _b Vector to compute the cross product with
         * @returns A number representing result of the cross product.
         */
        static CROSSPRODUCT(_a, _b) {
            let crossProduct = _a.x * _b.y - _a.y * _b.x;
            return crossProduct;
        }
        /**
         * Calculates the orthogonal vector to the given vector. Rotates counterclockwise by default.
         * ```plaintext
         *    ^                |
         *    |  =>  <--  =>   v  =>  -->
         * ```
         * @param _vector Vector to get the orthogonal equivalent of
         * @param _clockwise Should the rotation be clockwise instead of the default counterclockwise? default: false
         * @returns A Vector that is orthogonal to and has the same magnitude as the given Vector.
         */
        static ORTHOGONAL(_vector, _clockwise = false) {
            if (_clockwise)
                return new Vector2(_vector.y, -_vector.x);
            else
                return new Vector2(-_vector.y, _vector.x);
        }
        /**
         * Adds the given vector to the executing vector, changing the executor.
         * @param _addend The vector to add.
         */
        add(_addend) {
            this.data = new Vector2(_addend.x + this.x, _addend.y + this.y).data;
        }
        /**
         * Subtracts the given vector from the executing vector, changing the executor.
         * @param _subtrahend The vector to subtract.
         */
        subtract(_subtrahend) {
            this.data = new Vector2(this.x - _subtrahend.x, this.y - _subtrahend.y).data;
        }
        /**
         * Scales the Vector by the _scale.
         * @param _scale The scale to multiply the vector with.
         */
        scale(_scale) {
            this.data = new Vector2(_scale * this.x, _scale * this.y).data;
        }
        /**
         * Normalizes the vector.
         * @param _length A modificator to get a different length of normalized vector.
         */
        normalize(_length = 1) {
            this.data = Vector2.NORMALIZATION(this, _length).data;
        }
        /**
         * Sets the Vector to the given parameters. Ommitted parameters default to 0.
         * @param _x new x to set
         * @param _y new y to set
         */
        set(_x = 0, _y = 0) {
            this.data = new Float32Array([_x, _y]);
        }
        /**
         * Checks whether the given Vector is equal to the executed Vector.
         * @param _vector The vector to comapre with.
         * @returns true if the two vectors are equal, otherwise false
         */
        equals(_vector) {
            if (this.data[0] == _vector.data[0] && this.data[1] == _vector.data[1])
                return true;
            return false;
        }
        /**
         * @returns An array of the data of the vector
         */
        get() {
            return new Float32Array(this.data);
        }
        /**
         * @returns A deep copy of the vector.
         */
        get copy() {
            return new Vector2(this.x, this.y);
        }
        /**
         * Adds a z-component to the vector and returns a new Vector3
         */
        toVector3() {
            return new FudgeCore.Vector3(this.x, this.y, 0);
        }
        getMutator() {
            let mutator = {
                x: this.data[0], y: this.data[1]
            };
            return mutator;
        }
        reduceMutator(_mutator) { }
    }
    FudgeCore.Vector2 = Vector2;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Stores and manipulates a threedimensional vector comprised of the components x, y and z
     * ```plaintext
     *            +y
     *             |__ +x
     *            /
     *          +z
     * ```
     * @authors Jascha Karagöl, HFU, 2019 | Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class Vector3 extends FudgeCore.Mutable {
        constructor(_x = 0, _y = 0, _z = 0) {
            super();
            this.data = new Float32Array([_x, _y, _z]);
        }
        // TODO: implement equals-functions
        get x() {
            return this.data[0];
        }
        get y() {
            return this.data[1];
        }
        get z() {
            return this.data[2];
        }
        set x(_x) {
            this.data[0] = _x;
        }
        set y(_y) {
            this.data[1] = _y;
        }
        set z(_z) {
            this.data[2] = _z;
        }
        static X(_scale = 1) {
            const vector = new Vector3(_scale, 0, 0);
            return vector;
        }
        static Y(_scale = 1) {
            const vector = new Vector3(0, _scale, 0);
            return vector;
        }
        static Z(_scale = 1) {
            const vector = new Vector3(0, 0, _scale);
            return vector;
        }
        static ZERO() {
            const vector = new Vector3(0, 0, 0);
            return vector;
        }
        static ONE(_scale = 1) {
            const vector = new Vector3(_scale, _scale, _scale);
            return vector;
        }
        static TRANSFORMATION(_vector, _matrix, _includeTranslation = true) {
            let result = new Vector3();
            let m = _matrix.get();
            let [x, y, z] = _vector.get();
            result.x = m[0] * x + m[4] * y + m[8] * z;
            result.y = m[1] * x + m[5] * y + m[9] * z;
            result.z = m[2] * x + m[6] * y + m[10] * z;
            if (_includeTranslation) {
                result.add(_matrix.translation);
            }
            return result;
        }
        static NORMALIZATION(_vector, _length = 1) {
            let vector = Vector3.ZERO();
            try {
                let [x, y, z] = _vector.data;
                let factor = _length / Math.hypot(x, y, z);
                vector.data = new Float32Array([_vector.x * factor, _vector.y * factor, _vector.z * factor]);
            }
            catch (_e) {
                FudgeCore.Debug.warn(_e);
            }
            return vector;
        }
        /**
         * Sums up multiple vectors.
         * @param _vectors A series of vectors to sum up
         * @returns A new vector representing the sum of the given vectors
         */
        static SUM(..._vectors) {
            let result = new Vector3();
            for (let vector of _vectors)
                result.data = new Float32Array([result.x + vector.x, result.y + vector.y, result.z + vector.z]);
            return result;
        }
        /**
         * Subtracts two vectors.
         * @param _a The vector to subtract from.
         * @param _b The vector to subtract.
         * @returns A new vector representing the difference of the given vectors
         */
        static DIFFERENCE(_a, _b) {
            let vector = new Vector3;
            vector.data = new Float32Array([_a.x - _b.x, _a.y - _b.y, _a.z - _b.z]);
            return vector;
        }
        /**
         * Returns a new vector representing the given vector scaled by the given scaling factor
         */
        static SCALE(_vector, _scaling) {
            let scaled = new Vector3();
            scaled.data = new Float32Array([_vector.x * _scaling, _vector.y * _scaling, _vector.z * _scaling]);
            return scaled;
        }
        /**
         * Computes the crossproduct of 2 vectors.
         * @param _a The vector to multiply.
         * @param _b The vector to multiply by.
         * @returns A new vector representing the crossproduct of the given vectors
         */
        static CROSS(_a, _b) {
            let vector = new Vector3;
            vector.data = new Float32Array([
                _a.y * _b.z - _a.z * _b.y,
                _a.z * _b.x - _a.x * _b.z,
                _a.x * _b.y - _a.y * _b.x
            ]);
            return vector;
        }
        /**
         * Computes the dotproduct of 2 vectors.
         * @param _a The vector to multiply.
         * @param _b The vector to multiply by.
         * @returns A new vector representing the dotproduct of the given vectors
         */
        static DOT(_a, _b) {
            let scalarProduct = _a.x * _b.x + _a.y * _b.y + _a.z * _b.z;
            return scalarProduct;
        }
        /**
         * Calculates and returns the reflection of the incoming vector at the given normal vector. The length of normal should be 1.
         *     __________________
         *           /|\
         * incoming / | \ reflection
         *         /  |  \
         *          normal
         *
         */
        static REFLECTION(_incoming, _normal) {
            let dot = -Vector3.DOT(_incoming, _normal);
            let reflection = Vector3.SUM(_incoming, Vector3.SCALE(_normal, 2 * dot));
            return reflection;
        }
        add(_addend) {
            this.data = new Vector3(_addend.x + this.x, _addend.y + this.y, _addend.z + this.z).data;
        }
        subtract(_subtrahend) {
            this.data = new Vector3(this.x - _subtrahend.x, this.y - _subtrahend.y, this.z - _subtrahend.z).data;
        }
        scale(_scale) {
            this.data = new Vector3(_scale * this.x, _scale * this.y, _scale * this.z).data;
        }
        normalize(_length = 1) {
            this.data = Vector3.NORMALIZATION(this, _length).data;
        }
        set(_x = 0, _y = 0, _z = 0) {
            this.data = new Float32Array([_x, _y, _z]);
        }
        get() {
            return new Float32Array(this.data);
        }
        get copy() {
            return new Vector3(this.x, this.y, this.z);
        }
        transform(_matrix, _includeTranslation = true) {
            this.data = Vector3.TRANSFORMATION(this, _matrix, _includeTranslation).data;
        }
        /**
         * Drops the z-component and returns a Vector2 consisting of the x- and y-components
         */
        toVector2() {
            return new FudgeCore.Vector2(this.x, this.y);
        }
        reflect(_normal) {
            const reflected = Vector3.REFLECTION(this, _normal);
            this.set(reflected.x, reflected.y, reflected.z);
            FudgeCore.Recycler.store(reflected);
        }
        getMutator() {
            let mutator = {
                x: this.data[0], y: this.data[1], z: this.data[2]
            };
            return mutator;
        }
        reduceMutator(_mutator) { }
    }
    FudgeCore.Vector3 = Vector3;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Abstract base class for all meshes.
     * Meshes provide indexed vertices, the order of indices to create trigons and normals, and texture coordinates
     *
     * @authors Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class Mesh {
        constructor() {
            this.idResource = undefined;
        }
        static getBufferSpecification() {
            return { size: 3, dataType: WebGL2RenderingContext.FLOAT, normalize: false, stride: 0, offset: 0 };
        }
        getVertexCount() {
            return this.vertices.length / Mesh.getBufferSpecification().size;
        }
        getIndexCount() {
            return this.indices.length;
        }
        // Serialize/Deserialize for all meshes that calculate without parameters
        serialize() {
            let serialization = {
                idResource: this.idResource
            }; // no data needed ...
            return serialization;
        }
        deserialize(_serialization) {
            this.create(); // TODO: must not be created, if an identical mesh already exists
            this.idResource = _serialization.idResource;
            return this;
        }
    }
    FudgeCore.Mesh = Mesh;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Generate a simple cube with edges of length 1, each face consisting of two trigons
     * ```plaintext
     *            4____7
     *           0/__3/|
     *            ||5_||6
     *           1|/_2|/
     * ```
     * @authors Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class MeshCube extends FudgeCore.Mesh {
        constructor() {
            super();
            this.create();
        }
        create() {
            this.vertices = this.createVertices();
            this.indices = this.createIndices();
            this.textureUVs = this.createTextureUVs();
            this.normalsFace = this.createFaceNormals();
        }
        createVertices() {
            let vertices = new Float32Array([
                // First wrap
                // front
                /*0*/ -1, 1, 1, /*1*/ -1, -1, 1, /*2*/ 1, -1, 1, /*3*/ 1, 1, 1,
                // back
                /*4*/ -1, 1, -1, /* 5*/ -1, -1, -1, /* 6*/ 1, -1, -1, /* 7*/ 1, 1, -1,
                // Second wrap
                // front
                /*0*/ -1, 1, 1, /*1*/ -1, -1, 1, /*2*/ 1, -1, 1, /*3*/ 1, 1, 1,
                // back
                /*4*/ -1, 1, -1, /* 5*/ -1, -1, -1, /* 6*/ 1, -1, -1, /* 7*/ 1, 1, -1
            ]);
            // scale down to a length of 1 for all edges
            vertices = vertices.map(_value => _value / 2);
            return vertices;
        }
        createIndices() {
            let indices = new Uint16Array([
                // First wrap
                // front
                1, 2, 0, 2, 3, 0,
                // right
                2, 6, 3, 6, 7, 3,
                // back
                6, 5, 7, 5, 4, 7,
                // Second wrap
                // left
                5 + 8, 1 + 8, 4 + 8, 1 + 8, 0 + 8, 4 + 8,
                // top
                4 + 8, 0 + 8, 3 + 8, 7 + 8, 4 + 8, 3 + 8,
                // bottom
                5 + 8, 6 + 8, 1 + 8, 6 + 8, 2 + 8, 1 + 8
                /*,
                // left
                4, 5, 1, 4, 1, 0,
                // top
                4, 0, 3, 4, 3, 7,
                // bottom
                1, 5, 6, 1, 6, 2
                */
            ]);
            return indices;
        }
        createTextureUVs() {
            let textureUVs = new Float32Array([
                // First wrap
                // front
                /*0*/ 0, 0, /*1*/ 0, 1, /*2*/ 1, 1, /*3*/ 1, 0,
                // back
                /*4*/ 3, 0, /*5*/ 3, 1, /*6*/ 2, 1, /*7*/ 2, 0,
                // Second wrap
                // front
                /*0*/ 1, 0, /*1*/ 1, 1, /*2*/ 1, 2, /*3*/ 1, -1,
                // back
                /*4*/ 0, 0, /*5*/ 0, 1, /*6*/ 0, 2, /*7*/ 0, -1
            ]);
            return textureUVs;
        }
        createFaceNormals() {
            let normals = new Float32Array([
                // for each triangle, the last vertex of the three defining refers to the normalvector when using flat shading
                // First wrap
                // front
                /*0*/ 0, 0, 1, /*1*/ 0, 0, 0, /*2*/ 0, 0, 0, /*3*/ 1, 0, 0,
                // back
                /*4*/ 0, 0, 0, /*5*/ 0, 0, 0, /*6*/ 0, 0, 0, /*7*/ 0, 0, -1,
                // Second wrap
                // front
                /*0*/ 0, 0, 0, /*1*/ 0, -1, 0, /*2*/ 0, 0, 0, /*3*/ 0, 1, 0,
                // back
                /*4*/ -1, 0, 0, /*5*/ 0, 0, 0, /*6*/ 0, 0, 0, /*7*/ 0, 0, 0
            ]);
            //normals = this.createVertices();
            return normals;
        }
    }
    FudgeCore.MeshCube = MeshCube;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Generate a simple pyramid with edges at the base of length 1 and a height of 1. The sides consisting of one, the base of two trigons
     * ```plaintext
     *               4
     *              /\`.
     *            3/__\_\ 2
     *           0/____\/1
     * ```
     * @authors Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class MeshPyramid extends FudgeCore.Mesh {
        constructor() {
            super();
            this.create();
        }
        create() {
            this.vertices = this.createVertices();
            this.indices = this.createIndices();
            this.textureUVs = this.createTextureUVs();
            this.normalsFace = this.createFaceNormals();
        }
        createVertices() {
            let vertices = new Float32Array([
                // floor
                /*0*/ -1, 0, 1, /*1*/ 1, 0, 1, /*2*/ 1, 0, -1, /*3*/ -1, 0, -1,
                // tip
                /*4*/ 0, 2, 0,
                // floor again for texturing and normals
                /*5*/ -1, 0, 1, /*6*/ 1, 0, 1, /*7*/ 1, 0, -1, /*8*/ -1, 0, -1
            ]);
            // scale down to a length of 1 for bottom edges and height
            vertices = vertices.map(_value => _value / 2);
            return vertices;
        }
        createIndices() {
            let indices = new Uint16Array([
                // front
                4, 0, 1,
                // right
                4, 1, 2,
                // back
                4, 2, 3,
                // left
                4, 3, 0,
                // bottom
                5 + 0, 5 + 2, 5 + 1, 5 + 0, 5 + 3, 5 + 2
            ]);
            return indices;
        }
        createTextureUVs() {
            let textureUVs = new Float32Array([
                // front
                /*0*/ 0, 1, /*1*/ 0.5, 1, /*2*/ 1, 1, /*3*/ 0.5, 1,
                // back
                /*4*/ 0.5, 0,
                /*5*/ 0, 0, /*6*/ 1, 0, /*7*/ 1, 1, /*8*/ 0, 1
            ]);
            return textureUVs;
        }
        createFaceNormals() {
            let normals = [];
            let vertices = [];
            for (let v = 0; v < this.vertices.length; v += 3)
                vertices.push(new FudgeCore.Vector3(this.vertices[v], this.vertices[v + 1], this.vertices[v + 2]));
            for (let i = 0; i < this.indices.length; i += 3) {
                let vertex = [this.indices[i], this.indices[i + 1], this.indices[i + 2]];
                let v0 = FudgeCore.Vector3.DIFFERENCE(vertices[vertex[0]], vertices[vertex[1]]);
                let v1 = FudgeCore.Vector3.DIFFERENCE(vertices[vertex[0]], vertices[vertex[2]]);
                let normal = FudgeCore.Vector3.NORMALIZATION(FudgeCore.Vector3.CROSS(v0, v1));
                let index = vertex[2] * 3;
                normals[index] = normal.x;
                normals[index + 1] = normal.y;
                normals[index + 2] = normal.z;
                // normals.push(normal.x, normal.y, normal.z);
            }
            normals.push(0, 0, 0);
            return new Float32Array(normals);
        }
    }
    FudgeCore.MeshPyramid = MeshPyramid;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Generate a simple quad with edges of length 1, the face consisting of two trigons
     * ```plaintext
     *        0 __ 3
     *         |__|
     *        1    2
     * ```
     * @authors Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class MeshQuad extends FudgeCore.Mesh {
        constructor() {
            super();
            this.create();
        }
        create() {
            this.vertices = this.createVertices();
            this.indices = this.createIndices();
            this.textureUVs = this.createTextureUVs();
            this.normalsFace = this.createFaceNormals();
        }
        createVertices() {
            let vertices = new Float32Array([
                /*0*/ -1, 1, 0, /*1*/ -1, -1, 0, /*2*/ 1, -1, 0, /*3*/ 1, 1, 0
            ]);
            vertices = vertices.map(_value => _value / 2);
            return vertices;
        }
        createIndices() {
            let indices = new Uint16Array([
                1, 2, 0, 2, 3, 0
            ]);
            return indices;
        }
        createTextureUVs() {
            let textureUVs = new Float32Array([
                // front
                /*0*/ 0, 0, /*1*/ 0, 1, /*2*/ 1, 1, /*3*/ 1, 0
            ]);
            return textureUVs;
        }
        createFaceNormals() {
            return new Float32Array([
                /*0*/ 0, 0, 1, /*1*/ 0, 0, 0, /*2*/ 0, 0, 0, /*3*/ 1, 0, 0
            ]);
        }
    }
    FudgeCore.MeshQuad = MeshQuad;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Represents a node in the scenetree.
     * @authors Jascha Karagöl, HFU, 2019 | Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class Node extends EventTarget {
        /**
         * Creates a new node with a name and initializes all attributes
         * @param _name The name by which the node can be called.
         */
        constructor(_name) {
            super();
            this.mtxWorld = FudgeCore.Matrix4x4.IDENTITY;
            this.timestampUpdate = 0;
            this.parent = null; // The parent of this node.
            this.children = []; // array of child nodes appended to this node.
            this.components = {};
            // private tags: string[] = []; // Names of tags that are attached to this node. (TODO: As of yet no functionality)
            // private layers: string[] = []; // Names of the layers this node is on. (TODO: As of yet no functionality)
            this.listeners = {};
            this.captures = {};
            this.name = _name;
        }
        /**
         * Returns a reference to this nodes parent node
         */
        getParent() {
            return this.parent;
        }
        /**
         * Traces back the ancestors of this node and returns the first
         */
        getAncestor() {
            let ancestor = this;
            while (ancestor.getParent())
                ancestor = ancestor.getParent();
            return ancestor;
        }
        /**
         * Shortcut to retrieve this nodes [[ComponentTransform]]
         */
        get cmpTransform() {
            return this.getComponents(FudgeCore.ComponentTransform)[0];
        }
        /**
         * Shortcut to retrieve the local [[Matrix4x4]] attached to this nodes [[ComponentTransform]]
         * Returns null if no [[ComponentTransform]] is attached
         */
        // TODO: rejected for now, since there is some computational overhead, so node.mtxLocal should not be used carelessly
        // public get mtxLocal(): Matrix4x4 {
        //     let cmpTransform: ComponentTransform = this.cmpTransform;
        //     if (cmpTransform)
        //         return cmpTransform.local;
        //     else
        //         return null;
        // }
        // #region Scenetree
        /**
         * Returns a clone of the list of children
         */
        getChildren() {
            return this.children.slice(0);
        }
        /**
         * Returns an array of references to childnodes with the supplied name.
         * @param _name The name of the nodes to be found.
         * @return An array with references to nodes
         */
        getChildrenByName(_name) {
            let found = [];
            found = this.children.filter((_node) => _node.name == _name);
            return found;
        }
        /**
         * Adds the given reference to a node to the list of children, if not already in
         * @param _node The node to be added as a child
         * @throws Error when trying to add an ancestor of this
         */
        appendChild(_node) {
            if (this.children.includes(_node))
                // _node is already a child of this
                return;
            let ancestor = this;
            while (ancestor) {
                if (ancestor == _node)
                    throw (new Error("Cyclic reference prohibited in node hierarchy, ancestors must not be added as children"));
                else
                    ancestor = ancestor.parent;
            }
            this.children.push(_node);
            _node.setParent(this);
            _node.dispatchEvent(new Event("childAdd" /* CHILD_APPEND */, { bubbles: true }));
        }
        /**
         * Removes the reference to the give node from the list of children
         * @param _node The node to be removed.
         */
        removeChild(_node) {
            let found = this.findChild(_node);
            if (found < 0)
                return;
            _node.dispatchEvent(new Event("childRemove" /* CHILD_REMOVE */, { bubbles: true }));
            this.children.splice(found, 1);
            _node.setParent(null);
        }
        /**
         * Returns the position of the node in the list of children or -1 if not found
         * @param _node The node to be found.
         */
        findChild(_node) {
            return this.children.indexOf(_node);
        }
        /**
         * Replaces a child node with another, preserving the position in the list of children
         * @param _replace The node to be replaced
         * @param _with The node to replace with
         */
        replaceChild(_replace, _with) {
            let found = this.findChild(_replace);
            if (found < 0)
                return false;
            let previousParent = _with.getParent();
            if (previousParent)
                previousParent.removeChild(_with);
            _replace.setParent(null);
            this.children[found] = _with;
            _with.setParent(this);
            return true;
        }
        /**
         * Generator yielding the node and all successors in the branch below for iteration
         */
        get branch() {
            return this.getBranchGenerator();
        }
        isUpdated(_timestampUpdate) {
            return (this.timestampUpdate == _timestampUpdate);
        }
        /**
         * Applies a Mutator from [[Animation]] to all its components and transfers it to its children.
         * @param _mutator The mutator generated from an [[Animation]]
         */
        applyAnimation(_mutator) {
            if (_mutator.components) {
                for (let componentName in _mutator.components) {
                    if (this.components[componentName]) {
                        let mutatorOfComponent = _mutator.components;
                        for (let i in mutatorOfComponent[componentName]) {
                            if (this.components[componentName][+i]) {
                                let componentToMutate = this.components[componentName][+i];
                                let mutatorArray = mutatorOfComponent[componentName];
                                let mutatorWithComponentName = mutatorArray[+i];
                                for (let cname in mutatorWithComponentName) { // trick used to get the only entry in the list
                                    let mutatorToGive = mutatorWithComponentName[cname];
                                    componentToMutate.mutate(mutatorToGive);
                                }
                            }
                        }
                    }
                }
            }
            if (_mutator.children) {
                for (let i = 0; i < _mutator.children.length; i++) {
                    let name = _mutator.children[i]["ƒ.Node"].name;
                    let childNodes = this.getChildrenByName(name);
                    for (let childNode of childNodes) {
                        childNode.applyAnimation(_mutator.children[i]["ƒ.Node"]);
                    }
                }
            }
        }
        // #endregion
        // #region Components
        /**
         * Returns a list of all components attached to this node, independent of type.
         */
        getAllComponents() {
            let all = [];
            for (let type in this.components) {
                all = all.concat(this.components[type]);
            }
            return all;
        }
        /**
         * Returns a clone of the list of components of the given class attached to this node.
         * @param _class The class of the components to be found.
         */
        getComponents(_class) {
            return (this.components[_class.name] || []).slice(0);
        }
        /**
         * Returns the first compontent found of the given class attached this node or null, if list is empty or doesn't exist
         * @param _class The class of the components to be found.
         */
        getComponent(_class) {
            let list = this.components[_class.name];
            if (list)
                return list[0];
            return null;
        }
        /**
         * Adds the supplied component into the nodes component map.
         * @param _component The component to be pushed into the array.
         */
        addComponent(_component) {
            if (_component.getContainer() == this)
                return;
            if (this.components[_component.type] === undefined)
                this.components[_component.type] = [_component];
            else if (_component.isSingleton)
                throw new Error("Component is marked singleton and can't be attached, no more than one allowed");
            else
                this.components[_component.type].push(_component);
            _component.setContainer(this);
            _component.dispatchEvent(new Event("componentAdd" /* COMPONENT_ADD */));
        }
        /**
         * Removes the given component from the node, if it was attached, and sets its parent to null.
         * @param _component The component to be removed
         * @throws Exception when component is not found
         */
        removeComponent(_component) {
            try {
                let componentsOfType = this.components[_component.type];
                let foundAt = componentsOfType.indexOf(_component);
                if (foundAt < 0)
                    return;
                componentsOfType.splice(foundAt, 1);
                _component.setContainer(null);
                _component.dispatchEvent(new Event("componentRemove" /* COMPONENT_REMOVE */));
            }
            catch {
                throw new Error(`Unable to remove component '${_component}'in node named '${this.name}'`);
            }
        }
        // #endregion
        // #region Serialization
        serialize() {
            let serialization = {
                name: this.name
            };
            let components = {};
            for (let type in this.components) {
                components[type] = [];
                for (let component of this.components[type]) {
                    // components[type].push(component.serialize());
                    components[type].push(FudgeCore.Serializer.serialize(component));
                }
            }
            serialization["components"] = components;
            let children = [];
            for (let child of this.children) {
                children.push(FudgeCore.Serializer.serialize(child));
            }
            serialization["children"] = children;
            this.dispatchEvent(new Event("nodeSerialized" /* NODE_SERIALIZED */));
            return serialization;
        }
        deserialize(_serialization) {
            this.name = _serialization.name;
            // this.parent = is set when the nodes are added
            // deserialize components first so scripts can react to children being appended
            for (let type in _serialization.components) {
                for (let serializedComponent of _serialization.components[type]) {
                    let deserializedComponent = FudgeCore.Serializer.deserialize(serializedComponent);
                    this.addComponent(deserializedComponent);
                }
            }
            for (let serializedChild of _serialization.children) {
                let deserializedChild = FudgeCore.Serializer.deserialize(serializedChild);
                this.appendChild(deserializedChild);
            }
            this.dispatchEvent(new Event("nodeDeserialized" /* NODE_DESERIALIZED */));
            return this;
        }
        // #endregion
        // #region Events
        /**
         * Adds an event listener to the node. The given handler will be called when a matching event is passed to the node.
         * Deviating from the standard EventTarget, here the _handler must be a function and _capture is the only option.
         * @param _type The type of the event, should be an enumerated value of NODE_EVENT, can be any string
         * @param _handler The function to call when the event reaches this node
         * @param _capture When true, the listener listens in the capture phase, when the event travels deeper into the hierarchy of nodes.
         */
        addEventListener(_type, _handler, _capture = false) {
            if (_capture) {
                if (!this.captures[_type])
                    this.captures[_type] = [];
                this.captures[_type].push(_handler);
            }
            else {
                if (!this.listeners[_type])
                    this.listeners[_type] = [];
                this.listeners[_type].push(_handler);
            }
        }
        /**
         * Dispatches a synthetic event event to target. This implementation always returns true (standard: return true only if either event's cancelable attribute value is false or its preventDefault() method was not invoked)
         * The event travels into the hierarchy to this node dispatching the event, invoking matching handlers of the nodes ancestors listening to the capture phase,
         * than the matching handler of the target node in the target phase, and back out of the hierarchy in the bubbling phase, invoking appropriate handlers of the anvestors
         * @param _event The event to dispatch
         */
        dispatchEvent(_event) {
            let ancestors = [];
            let upcoming = this;
            // overwrite event target
            Object.defineProperty(_event, "target", { writable: true, value: this });
            // TODO: consider using Reflect instead of Object throughout. See also Render and Mutable...
            while (upcoming.parent)
                ancestors.push(upcoming = upcoming.parent);
            // capture phase
            Object.defineProperty(_event, "eventPhase", { writable: true, value: Event.CAPTURING_PHASE });
            for (let i = ancestors.length - 1; i >= 0; i--) {
                let ancestor = ancestors[i];
                Object.defineProperty(_event, "currentTarget", { writable: true, value: ancestor });
                let captures = ancestor.captures[_event.type] || [];
                for (let handler of captures)
                    handler(_event);
            }
            if (!_event.bubbles)
                return true;
            // target phase
            Object.defineProperty(_event, "eventPhase", { writable: true, value: Event.AT_TARGET });
            Object.defineProperty(_event, "currentTarget", { writable: true, value: this });
            let listeners = this.listeners[_event.type] || [];
            for (let handler of listeners)
                handler(_event);
            // bubble phase
            Object.defineProperty(_event, "eventPhase", { writable: true, value: Event.BUBBLING_PHASE });
            for (let i = 0; i < ancestors.length; i++) {
                let ancestor = ancestors[i];
                Object.defineProperty(_event, "currentTarget", { writable: true, value: ancestor });
                let listeners = ancestor.listeners[_event.type] || [];
                for (let handler of listeners)
                    handler(_event);
            }
            return true; //TODO: return a meaningful value, see documentation of dispatch event
        }
        /**
         * Broadcasts a synthetic event event to this node and from there to all nodes deeper in the hierarchy,
         * invoking matching handlers of the nodes listening to the capture phase. Watch performance when there are many nodes involved
         * @param _event The event to broadcast
         */
        broadcastEvent(_event) {
            // overwrite event target and phase
            Object.defineProperty(_event, "eventPhase", { writable: true, value: Event.CAPTURING_PHASE });
            Object.defineProperty(_event, "target", { writable: true, value: this });
            this.broadcastEventRecursive(_event);
        }
        broadcastEventRecursive(_event) {
            // capture phase only
            Object.defineProperty(_event, "currentTarget", { writable: true, value: this });
            let captures = this.captures[_event.type] || [];
            for (let handler of captures)
                handler(_event);
            // appears to be slower, astonishingly...
            // captures.forEach(function (handler: Function): void {
            //     handler(_event);
            // });
            // same for children
            for (let child of this.children) {
                child.broadcastEventRecursive(_event);
            }
        }
        // #endregion
        /**
         * Sets the parent of this node to be the supplied node. Will be called on the child that is appended to this node by appendChild().
         * @param _parent The parent to be set for this node.
         */
        setParent(_parent) {
            this.parent = _parent;
        }
        *getBranchGenerator() {
            yield this;
            for (let child of this.children)
                yield* child.branch;
        }
    }
    FudgeCore.Node = Node;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * A node managed by [[ResourceManager]] that functions as a template for [[NodeResourceInstance]]s
     */
    class NodeResource extends FudgeCore.Node {
        constructor() {
            super(...arguments);
            this.idResource = undefined;
        }
    }
    FudgeCore.NodeResource = NodeResource;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * An instance of a [[NodeResource]].
     * This node keeps a reference to its resource an can thus optimize serialization
     */
    class NodeResourceInstance extends FudgeCore.Node {
        constructor(_nodeResource) {
            super("NodeResourceInstance");
            /** id of the resource that instance was created from */
            // TODO: examine, if this should be a direct reference to the NodeResource, instead of the id
            this.idSource = undefined;
            if (_nodeResource)
                this.set(_nodeResource);
        }
        /**
         * Recreate this node from the [[NodeResource]] referenced
         */
        reset() {
            let resource = FudgeCore.ResourceManager.get(this.idSource);
            this.set(resource);
        }
        //TODO: optimize using the referenced NodeResource, serialize/deserialize only the differences
        serialize() {
            let serialization = super.serialize();
            serialization.idSource = this.idSource;
            return serialization;
        }
        deserialize(_serialization) {
            super.deserialize(_serialization);
            this.idSource = _serialization.idSource;
            return this;
        }
        /**
         * Set this node to be a recreation of the [[NodeResource]] given
         * @param _nodeResource
         */
        set(_nodeResource) {
            // TODO: examine, if the serialization should be stored in the NodeResource for optimization
            let serialization = FudgeCore.Serializer.serialize(_nodeResource);
            //Serializer.deserialize(serialization);
            for (let path in serialization) {
                this.deserialize(serialization[path]);
                break;
            }
            this.idSource = _nodeResource.idResource;
            this.dispatchEvent(new Event("nodeResourceInstantiated" /* NODERESOURCE_INSTANTIATED */));
        }
    }
    FudgeCore.NodeResourceInstance = NodeResourceInstance;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    class Ray {
        constructor(_direction = FudgeCore.Vector3.Z(-1), _origin = FudgeCore.Vector3.ZERO(), _length = 1) {
            this.origin = _origin;
            this.direction = _direction;
            this.length = _length;
        }
    }
    FudgeCore.Ray = Ray;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    class RayHit {
        constructor(_node = null, _face = 0, _zBuffer = 0) {
            this.node = _node;
            this.face = _face;
            this.zBuffer = _zBuffer;
        }
    }
    FudgeCore.RayHit = RayHit;
})(FudgeCore || (FudgeCore = {}));
/// <reference path="RenderOperator.ts"/>
var FudgeCore;
/// <reference path="RenderOperator.ts"/>
(function (FudgeCore) {
    /**
     * This class manages the references to render data used by nodes.
     * Multiple nodes may refer to the same data via their references to shader, coat and mesh
     */
    class Reference {
        constructor(_reference) {
            this.count = 0;
            this.reference = _reference;
        }
        getReference() {
            return this.reference;
        }
        increaseCounter() {
            this.count++;
            return this.count;
        }
        decreaseCounter() {
            if (this.count == 0)
                throw (new Error("Negative reference counter"));
            this.count--;
            return this.count;
        }
    }
    /**
     * Manages the handling of the ressources that are going to be rendered by [[RenderOperator]].
     * Stores the references to the shader, the coat and the mesh used for each node registered.
     * With these references, the already buffered data is retrieved when rendering.
     */
    class RenderManager extends FudgeCore.RenderOperator {
        // #region Adding
        /**
         * Register the node for rendering. Create a reference for it and increase the matching render-data references or create them first if necessary
         * @param _node
         */
        static addNode(_node) {
            if (RenderManager.nodes.get(_node))
                return;
            let cmpMaterial = _node.getComponent(FudgeCore.ComponentMaterial);
            if (!cmpMaterial)
                return;
            let shader = cmpMaterial.material.getShader();
            RenderManager.createReference(RenderManager.renderShaders, shader, RenderManager.createProgram);
            let coat = cmpMaterial.material.getCoat();
            RenderManager.createReference(RenderManager.renderCoats, coat, RenderManager.createParameter);
            let mesh = _node.getComponent(FudgeCore.ComponentMesh).mesh;
            RenderManager.createReference(RenderManager.renderBuffers, mesh, RenderManager.createBuffers);
            let nodeReferences = { shader: shader, coat: coat, mesh: mesh }; //, doneTransformToWorld: false };
            RenderManager.nodes.set(_node, nodeReferences);
        }
        /**
         * Register the node and its valid successors in the branch for rendering using [[addNode]]
         * @param _node
         * @returns false, if the given node has a current timestamp thus having being processed during latest RenderManager.update and no addition is needed
         */
        static addBranch(_node) {
            if (_node.isUpdated(RenderManager.timestampUpdate))
                return false;
            for (let node of _node.branch)
                try {
                    // may fail when some components are missing. TODO: cleanup
                    RenderManager.addNode(node);
                }
                catch (_e) {
                    FudgeCore.Debug.log(_e);
                }
            return true;
        }
        // #endregion
        // #region Removing
        /**
         * Unregister the node so that it won't be rendered any more. Decrease the render-data references and delete the node reference.
         * @param _node
         */
        static removeNode(_node) {
            let nodeReferences = RenderManager.nodes.get(_node);
            if (!nodeReferences)
                return;
            RenderManager.removeReference(RenderManager.renderShaders, nodeReferences.shader, RenderManager.deleteProgram);
            RenderManager.removeReference(RenderManager.renderCoats, nodeReferences.coat, RenderManager.deleteParameter);
            RenderManager.removeReference(RenderManager.renderBuffers, nodeReferences.mesh, RenderManager.deleteBuffers);
            RenderManager.nodes.delete(_node);
        }
        /**
         * Unregister the node and its valid successors in the branch to free renderer resources. Uses [[removeNode]]
         * @param _node
         */
        static removeBranch(_node) {
            for (let node of _node.branch)
                RenderManager.removeNode(node);
        }
        // #endregion
        // #region Updating
        /**
         * Reflect changes in the node concerning shader, coat and mesh, manage the render-data references accordingly and update the node references
         * @param _node
         */
        static updateNode(_node) {
            let nodeReferences = RenderManager.nodes.get(_node);
            if (!nodeReferences)
                return;
            let cmpMaterial = _node.getComponent(FudgeCore.ComponentMaterial);
            let shader = cmpMaterial.material.getShader();
            if (shader !== nodeReferences.shader) {
                RenderManager.removeReference(RenderManager.renderShaders, nodeReferences.shader, RenderManager.deleteProgram);
                RenderManager.createReference(RenderManager.renderShaders, shader, RenderManager.createProgram);
                nodeReferences.shader = shader;
            }
            let coat = cmpMaterial.material.getCoat();
            if (coat !== nodeReferences.coat) {
                RenderManager.removeReference(RenderManager.renderCoats, nodeReferences.coat, RenderManager.deleteParameter);
                RenderManager.createReference(RenderManager.renderCoats, coat, RenderManager.createParameter);
                nodeReferences.coat = coat;
            }
            let mesh = (_node.getComponent(FudgeCore.ComponentMesh)).mesh;
            if (mesh !== nodeReferences.mesh) {
                RenderManager.removeReference(RenderManager.renderBuffers, nodeReferences.mesh, RenderManager.deleteBuffers);
                RenderManager.createReference(RenderManager.renderBuffers, mesh, RenderManager.createBuffers);
                nodeReferences.mesh = mesh;
            }
        }
        /**
         * Update the node and its valid successors in the branch using [[updateNode]]
         * @param _node
         */
        static updateBranch(_node) {
            for (let node of _node.branch)
                RenderManager.updateNode(node);
        }
        // #endregion
        // #region Lights
        /**
         * Viewports collect the lights relevant to the branch to render and calls setLights to pass the collection.
         * RenderManager passes it on to all shaders used that can process light
         * @param _lights
         */
        static setLights(_lights) {
            // let renderLights: RenderLights = RenderManager.createRenderLights(_lights);
            for (let entry of RenderManager.renderShaders) {
                let renderShader = entry[1].getReference();
                RenderManager.setLightsInShader(renderShader, _lights);
            }
            // debugger;
        }
        // #endregion
        // #region Rendering
        /**
         * Update all render data. After RenderManager, multiple viewports can render their associated data without updating the same data multiple times
         */
        static update() {
            RenderManager.timestampUpdate = performance.now();
            RenderManager.recalculateAllNodeTransforms();
        }
        /**
         * Clear the offscreen renderbuffer with the given [[Color]]
         * @param _color
         */
        static clear(_color = null) {
            RenderManager.crc3.clearColor(_color.r, _color.g, _color.b, _color.a);
            RenderManager.crc3.clear(WebGL2RenderingContext.COLOR_BUFFER_BIT | WebGL2RenderingContext.DEPTH_BUFFER_BIT);
        }
        /**
         * Reset the offscreen framebuffer to the original RenderingContext
         */
        static resetFrameBuffer(_color = null) {
            RenderManager.crc3.bindFramebuffer(WebGL2RenderingContext.FRAMEBUFFER, null);
        }
        /**
         * Draws the branch starting with the given [[Node]] using the camera given [[ComponentCamera]].
         * @param _node
         * @param _cmpCamera
         */
        static drawBranch(_node, _cmpCamera, _drawNode = RenderManager.drawNode) {
            if (_drawNode == RenderManager.drawNode)
                RenderManager.resetFrameBuffer();
            let finalTransform;
            let cmpMesh = _node.getComponent(FudgeCore.ComponentMesh);
            if (cmpMesh)
                finalTransform = FudgeCore.Matrix4x4.MULTIPLICATION(_node.mtxWorld, cmpMesh.pivot);
            else
                finalTransform = _node.mtxWorld; // caution, RenderManager is a reference...
            // multiply camera matrix
            let projection = FudgeCore.Matrix4x4.MULTIPLICATION(_cmpCamera.ViewProjectionMatrix, finalTransform);
            _drawNode(_node, finalTransform, projection);
            for (let name in _node.getChildren()) {
                let childNode = _node.getChildren()[name];
                RenderManager.drawBranch(childNode, _cmpCamera, _drawNode); //, world);
            }
            FudgeCore.Recycler.store(projection);
            if (finalTransform != _node.mtxWorld)
                FudgeCore.Recycler.store(finalTransform);
        }
        //#region RayCast & Picking
        /**
         * Draws the branch for RayCasting starting with the given [[Node]] using the camera given [[ComponentCamera]].
         * @param _node
         * @param _cmpCamera
         */
        static drawBranchForRayCast(_node, _cmpCamera) {
            RenderManager.pickBuffers = [];
            if (!RenderManager.renderShaders.get(FudgeCore.ShaderRayCast))
                RenderManager.createReference(RenderManager.renderShaders, FudgeCore.ShaderRayCast, RenderManager.createProgram);
            RenderManager.drawBranch(_node, _cmpCamera, RenderManager.drawNodeForRayCast);
            RenderManager.resetFrameBuffer();
            return RenderManager.pickBuffers;
        }
        static pickNodeAt(_pos, _pickBuffers, _rect) {
            let hits = [];
            for (let pickBuffer of _pickBuffers) {
                RenderManager.crc3.bindFramebuffer(WebGL2RenderingContext.FRAMEBUFFER, pickBuffer.frameBuffer);
                // TODO: instead of reading all data and afterwards pick the pixel, read only the pixel!
                let data = new Uint8Array(_rect.width * _rect.height * 4);
                RenderManager.crc3.readPixels(0, 0, _rect.width, _rect.height, WebGL2RenderingContext.RGBA, WebGL2RenderingContext.UNSIGNED_BYTE, data);
                let pixel = _pos.x + _rect.width * _pos.y;
                let zBuffer = data[4 * pixel + 2] + data[4 * pixel + 3] / 256;
                let hit = new FudgeCore.RayHit(pickBuffer.node, 0, zBuffer);
                hits.push(hit);
            }
            return hits;
        }
        static drawNode(_node, _finalTransform, _projection) {
            let references = RenderManager.nodes.get(_node);
            if (!references)
                return; // TODO: deal with partial references
            let bufferInfo = RenderManager.renderBuffers.get(references.mesh).getReference();
            let coatInfo = RenderManager.renderCoats.get(references.coat).getReference();
            let shaderInfo = RenderManager.renderShaders.get(references.shader).getReference();
            RenderManager.draw(shaderInfo, bufferInfo, coatInfo, _finalTransform, _projection);
        }
        static drawNodeForRayCast(_node, _finalTransform, _projection) {
            // TODO: look into SSBOs!
            let target = RenderManager.getRayCastTexture();
            const framebuffer = RenderManager.crc3.createFramebuffer();
            // render to our targetTexture by binding the framebuffer
            RenderManager.crc3.bindFramebuffer(WebGL2RenderingContext.FRAMEBUFFER, framebuffer);
            // attach the texture as the first color attachment
            const attachmentPoint = WebGL2RenderingContext.COLOR_ATTACHMENT0;
            RenderManager.crc3.framebufferTexture2D(WebGL2RenderingContext.FRAMEBUFFER, attachmentPoint, WebGL2RenderingContext.TEXTURE_2D, target, 0);
            // set render target
            let references = RenderManager.nodes.get(_node);
            if (!references)
                return; // TODO: deal with partial references
            let pickBuffer = { node: _node, texture: target, frameBuffer: framebuffer };
            RenderManager.pickBuffers.push(pickBuffer);
            let bufferInfo = RenderManager.renderBuffers.get(references.mesh).getReference();
            RenderManager.drawForRayCast(RenderManager.pickBuffers.length, bufferInfo, _finalTransform, _projection);
            // make texture available to onscreen-display
            // IDEA: Iterate over textures, collect data if z indicates hit, sort by z
        }
        static getRayCastTexture() {
            // create to render to
            const targetTextureWidth = RenderManager.getViewportRectangle().width;
            const targetTextureHeight = RenderManager.getViewportRectangle().height;
            const targetTexture = RenderManager.crc3.createTexture();
            RenderManager.crc3.bindTexture(WebGL2RenderingContext.TEXTURE_2D, targetTexture);
            {
                const internalFormat = WebGL2RenderingContext.RGBA8;
                const format = WebGL2RenderingContext.RGBA;
                const type = WebGL2RenderingContext.UNSIGNED_BYTE;
                RenderManager.crc3.texImage2D(WebGL2RenderingContext.TEXTURE_2D, 0, internalFormat, targetTextureWidth, targetTextureHeight, 0, format, type, null);
                // set the filtering so we don't need mips
                RenderManager.crc3.texParameteri(WebGL2RenderingContext.TEXTURE_2D, WebGL2RenderingContext.TEXTURE_MIN_FILTER, WebGL2RenderingContext.LINEAR);
                RenderManager.crc3.texParameteri(WebGL2RenderingContext.TEXTURE_2D, WebGL2RenderingContext.TEXTURE_WRAP_S, WebGL2RenderingContext.CLAMP_TO_EDGE);
                RenderManager.crc3.texParameteri(WebGL2RenderingContext.TEXTURE_2D, WebGL2RenderingContext.TEXTURE_WRAP_T, WebGL2RenderingContext.CLAMP_TO_EDGE);
            }
            return targetTexture;
        }
        //#endregion
        //#region Transformation of branch
        /**
         * Recalculate the world matrix of all registered nodes respecting their hierarchical relation.
         */
        static recalculateAllNodeTransforms() {
            // inner function to be called in a for each node at the bottom of RenderManager function
            // function markNodeToBeTransformed(_nodeReferences: NodeReferences, _node: Node, _map: MapNodeToNodeReferences): void {
            //     _nodeReferences.doneTransformToWorld = false;
            // }
            // inner function to be called in a for each node at the bottom of RenderManager function
            let recalculateBranchContainingNode = (_nodeReferences, _node, _map) => {
                // find uppermost ancestor not recalculated yet
                let ancestor = _node;
                let parent;
                while (true) {
                    parent = ancestor.getParent();
                    if (!parent)
                        break;
                    if (_node.isUpdated(RenderManager.timestampUpdate))
                        break;
                    ancestor = parent;
                }
                // TODO: check if nodes without meshes must be registered
                // use the ancestors parent world matrix to start with, or identity if no parent exists or it's missing a ComponenTransform
                let matrix = FudgeCore.Matrix4x4.IDENTITY;
                if (parent)
                    matrix = parent.mtxWorld;
                // start recursive recalculation of the whole branch starting from the ancestor found
                RenderManager.recalculateTransformsOfNodeAndChildren(ancestor, matrix);
            };
            // call the functions above for each registered node
            // RenderManager.nodes.forEach(markNodeToBeTransformed);
            RenderManager.nodes.forEach(recalculateBranchContainingNode);
        }
        /**
         * Recursive method receiving a childnode and its parents updated world transform.
         * If the childnode owns a ComponentTransform, its worldmatrix is recalculated and passed on to its children, otherwise its parents matrix
         * @param _node
         * @param _world
         */
        static recalculateTransformsOfNodeAndChildren(_node, _world) {
            let world = _world;
            let cmpTransform = _node.cmpTransform;
            if (cmpTransform)
                world = FudgeCore.Matrix4x4.MULTIPLICATION(_world, cmpTransform.local);
            _node.mtxWorld = world;
            _node.timestampUpdate = RenderManager.timestampUpdate;
            for (let child of _node.getChildren()) {
                RenderManager.recalculateTransformsOfNodeAndChildren(child, world);
            }
        }
        // #endregion
        // #region Manage references to render data
        /**
         * Removes a reference to a program, parameter or buffer by decreasing its reference counter and deleting it, if the counter reaches 0
         * @param _in
         * @param _key
         * @param _deletor
         */
        static removeReference(_in, _key, _deletor) {
            let reference;
            reference = _in.get(_key);
            if (reference.decreaseCounter() == 0) {
                // The following deletions may be an optimization, not necessary to start with and maybe counterproductive.
                // If data should be used later again, it must then be reconstructed...
                _deletor(reference.getReference());
                _in.delete(_key);
            }
        }
        /**
         * Increases the counter of the reference to a program, parameter or buffer. Creates the reference, if it's not existent.
         * @param _in
         * @param _key
         * @param _creator
         */
        static createReference(_in, _key, _creator) {
            let reference;
            reference = _in.get(_key);
            if (reference)
                reference.increaseCounter();
            else {
                let content = _creator(_key);
                reference = new Reference(content);
                reference.increaseCounter();
                _in.set(_key, reference);
            }
        }
    }
    /** Stores references to the compiled shader programs and makes them available via the references to shaders */
    RenderManager.renderShaders = new Map();
    /** Stores references to the vertex array objects and makes them available via the references to coats */
    RenderManager.renderCoats = new Map();
    /** Stores references to the vertex buffers and makes them available via the references to meshes */
    RenderManager.renderBuffers = new Map();
    RenderManager.nodes = new Map();
    FudgeCore.RenderManager = RenderManager;
})(FudgeCore || (FudgeCore = {}));
/// <reference path="../Coat/Coat.ts"/>
var FudgeCore;
/// <reference path="../Coat/Coat.ts"/>
(function (FudgeCore) {
    /**
     * Static superclass for the representation of WebGl shaderprograms.
     * @authors Jascha Karagöl, HFU, 2019 | Jirka Dell'Oro-Friedl, HFU, 2019
     */
    // TODO: define attribute/uniforms as layout and use those consistently in shaders
    class Shader {
        /** The type of coat that can be used with this shader to create a material */
        static getCoat() { return null; }
        static getVertexShaderSource() { return null; }
        static getFragmentShaderSource() { return null; }
    }
    FudgeCore.Shader = Shader;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Single color shading
     * @authors Jascha Karagöl, HFU, 2019 | Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class ShaderFlat extends FudgeCore.Shader {
        static getCoat() {
            return FudgeCore.CoatColored;
        }
        static getVertexShaderSource() {
            return `#version 300 es

                    struct LightAmbient {
                        vec4 color;
                    };
                    struct LightDirectional {
                        vec4 color;
                        vec3 direction;
                    };

                    const uint MAX_LIGHTS_DIRECTIONAL = 10u;

                    in vec3 a_position;
                    in vec3 a_normal;
                    uniform mat4 u_world;
                    uniform mat4 u_projection;

                    uniform LightAmbient u_ambient;
                    uniform uint u_nLightsDirectional;
                    uniform LightDirectional u_directional[MAX_LIGHTS_DIRECTIONAL];
                    flat out vec4 v_color;
                    
                    void main() {   
                        gl_Position = u_projection * vec4(a_position, 1.0);
                        vec3 normal = mat3(u_world) * a_normal;

                        v_color = vec4(0,0,0,0);
                        for (uint i = 0u; i < u_nLightsDirectional; i++) {
                            float illumination = -dot(normal, u_directional[i].direction);
                            if (illumination > 0.0f)
                                v_color += illumination * u_directional[i].color; // vec4(1,1,1,1); // 
                        }
                        //u_ambient;
                        //u_directional[0];
                    }`;
        }
        static getFragmentShaderSource() {
            return `#version 300 es
                    precision mediump float;

                    uniform vec4 u_color;
                    flat in vec4 v_color;
                    out vec4 frag;
                    
                    void main() {
                        frag = u_color * v_color;
                    }`;
        }
    }
    FudgeCore.ShaderFlat = ShaderFlat;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Matcap (Material Capture) shading. The texture provided by the coat is used as a matcap material.
     * Implementation based on https://www.clicktorelease.com/blog/creating-spherical-environment-mapping-shader/
     * @authors Simon Storl-Schulke, HFU, 2019 | Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class ShaderMatCap extends FudgeCore.Shader {
        static getCoat() {
            return FudgeCore.CoatMatCap;
        }
        static getVertexShaderSource() {
            return `#version 300 es

                    in vec3 a_position;
                    in vec3 a_normal;
                    uniform mat4 u_projection;

                    out vec2 tex_coords_smooth;
                    flat out vec2 tex_coords_flat;

                    void main() {
                        mat4 normalMatrix = transpose(inverse(u_projection));
                        vec4 p = vec4(a_position, 1.0);
                        vec4 normal4 = vec4(a_normal, 1.0);
                        vec3 e = normalize( vec3( u_projection * p ) );
                        vec3 n = normalize( vec3(normalMatrix * normal4) );

                        vec3 r = reflect( e, n );
                        float m = 2. * sqrt(
                            pow( r.x, 2. ) +
                            pow( r.y, 2. ) +
                            pow( r.z + 1., 2. )
                        );

                        tex_coords_smooth = r.xy / m + .5;
                        tex_coords_flat = r.xy / m + .5;

                        gl_Position = u_projection * vec4(a_position, 1.0);
                    }`;
        }
        static getFragmentShaderSource() {
            return `#version 300 es
                    precision mediump float;
                    
                    uniform vec4 u_tint_color;
                    uniform float u_flatmix;
                    uniform sampler2D u_texture;
                    
                    in vec2 tex_coords_smooth;
                    flat in vec2 tex_coords_flat;

                    out vec4 frag;

                    void main() {
                        vec2 tc = mix(tex_coords_smooth, tex_coords_flat, u_flatmix);
                        frag = u_tint_color * texture(u_texture, tc) * 2.0;
                    }`;
        }
    }
    FudgeCore.ShaderMatCap = ShaderMatCap;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Renders for Raycasting
     * @authors Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class ShaderRayCast extends FudgeCore.Shader {
        static getVertexShaderSource() {
            return `#version 300 es

                    in vec3 a_position;
                    uniform mat4 u_projection;
                    
                    void main() {   
                        gl_Position = u_projection * vec4(a_position, 1.0);
                    }`;
        }
        static getFragmentShaderSource() {
            return `#version 300 es
                    precision mediump float;
                    precision highp int;
                    
                    uniform int u_id;
                    out vec4 frag;
                    
                    void main() {
                       float id = float(u_id)/ 256.0;
                       float upperbyte = trunc(gl_FragCoord.z * 256.0) / 256.0;
                       float lowerbyte = fract(gl_FragCoord.z * 256.0);
                       frag = vec4(id, id, upperbyte , lowerbyte);
                    }`;
        }
    }
    FudgeCore.ShaderRayCast = ShaderRayCast;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Textured shading
     * @authors Jascha Karagöl, HFU, 2019 | Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class ShaderTexture extends FudgeCore.Shader {
        static getCoat() {
            return FudgeCore.CoatTextured;
        }
        static getVertexShaderSource() {
            return `#version 300 es

                in vec3 a_position;
                in vec2 a_textureUVs;
                uniform mat4 u_projection;
                uniform vec4 u_color;
                out vec2 v_textureUVs;

                void main() {  
                    gl_Position = u_projection * vec4(a_position, 1.0);
                    v_textureUVs = a_textureUVs;
                }`;
        }
        static getFragmentShaderSource() {
            return `#version 300 es
                precision mediump float;
                
                in vec2 v_textureUVs;
                uniform sampler2D u_texture;
                out vec4 frag;
                
                void main() {
                    frag = texture(u_texture, v_textureUVs);
            }`;
        }
    }
    FudgeCore.ShaderTexture = ShaderTexture;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Single color shading
     * @authors Jascha Karagöl, HFU, 2019 | Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class ShaderUniColor extends FudgeCore.Shader {
        static getCoat() {
            return FudgeCore.CoatColored;
        }
        static getVertexShaderSource() {
            return `#version 300 es

                    in vec3 a_position;
                    uniform mat4 u_projection;
                    
                    void main() {   
                        gl_Position = u_projection * vec4(a_position, 1.0);
                    }`;
        }
        static getFragmentShaderSource() {
            return `#version 300 es
                    precision mediump float;
                    
                    uniform vec4 u_color;
                    out vec4 frag;
                    
                    void main() {
                       frag = u_color;
                    }`;
        }
    }
    FudgeCore.ShaderUniColor = ShaderUniColor;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Baseclass for different kinds of textures.
     * @authors Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class Texture extends FudgeCore.Mutable {
        reduceMutator() { }
    }
    FudgeCore.Texture = Texture;
    /**
     * Texture created from an existing image
     */
    class TextureImage extends Texture {
        constructor() {
            super(...arguments);
            this.image = null;
        }
    }
    FudgeCore.TextureImage = TextureImage;
    /**
     * Texture created from a canvas
     */
    class TextureCanvas extends Texture {
    }
    FudgeCore.TextureCanvas = TextureCanvas;
    /**
     * Texture created from a FUDGE-Sketch
     */
    class TextureSketch extends TextureCanvas {
    }
    FudgeCore.TextureSketch = TextureSketch;
    /**
     * Texture created from an HTML-page
     */
    class TextureHTML extends TextureCanvas {
    }
    FudgeCore.TextureHTML = TextureHTML;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    let TIMER_TYPE;
    (function (TIMER_TYPE) {
        TIMER_TYPE[TIMER_TYPE["INTERVAL"] = 0] = "INTERVAL";
        TIMER_TYPE[TIMER_TYPE["TIMEOUT"] = 1] = "TIMEOUT";
    })(TIMER_TYPE || (TIMER_TYPE = {}));
    class Timer {
        constructor(_time, _type, _callback, _timeout, _arguments) {
            this.type = _type;
            this.timeout = _timeout;
            this.arguments = _arguments;
            this.startTimeReal = performance.now();
            this.callback = _callback;
            let scale = Math.abs(_time.getScale());
            if (!scale) {
                // Time is stopped, timer won't be active
                this.active = false;
                return;
            }
            let id;
            this.timeoutReal = this.timeout / scale;
            if (this.type == TIMER_TYPE.TIMEOUT) {
                let callback = () => {
                    _time.deleteTimerByInternalId(this.id);
                    _callback(_arguments);
                };
                id = window.setTimeout(callback, this.timeoutReal);
            }
            else
                id = window.setInterval(_callback, this.timeoutReal, _arguments);
            this.id = id;
            this.active = true;
        }
        clear() {
            if (this.type == TIMER_TYPE.TIMEOUT) {
                if (this.active)
                    // save remaining time to timeout as new timeout for restart
                    this.timeout = this.timeout * (1 - (performance.now() - this.startTimeReal) / this.timeoutReal);
                window.clearTimeout(this.id);
            }
            else
                // TODO: reusing timer starts interval anew. Should be remaining interval as timeout, then starting interval anew 
                window.clearInterval(this.id);
            this.active = false;
        }
    }
    /**
     * Instances of this class generate a timestamp that correlates with the time elapsed since the start of the program but allows for resetting and scaling.
     * Supports interval- and timeout-callbacks identical with standard Javascript but with respect to the scaled time
     * @authors Jirka Dell'Oro-Friedl, HFU, 2019
     */
    class Time extends EventTarget {
        constructor() {
            super();
            this.timers = {};
            this.idTimerNext = 0;
            this.start = performance.now();
            this.scale = 1.0;
            this.offset = 0.0;
            this.lastCallToElapsed = 0.0;
        }
        /**
         * Returns the game-time-object which starts automatically and serves as base for various internal operations.
         */
        static get game() {
            return Time.gameTime;
        }
        /**
         * Retrieves the current scaled timestamp of this instance in milliseconds
         */
        get() {
            return this.offset + this.scale * (performance.now() - this.start);
        }
        /**
         * (Re-) Sets the timestamp of this instance
         * @param _time The timestamp to represent the current time (default 0.0)
         */
        set(_time = 0) {
            this.offset = _time;
            this.start = performance.now();
            this.getElapsedSincePreviousCall();
        }
        /**
         * Sets the scaling of this time, allowing for slowmotion (<1) or fastforward (>1)
         * @param _scale The desired scaling (default 1.0)
         */
        setScale(_scale = 1.0) {
            this.set(this.get());
            this.scale = _scale;
            //TODO: catch scale=0
            this.rescaleAllTimers();
            this.getElapsedSincePreviousCall();
            this.dispatchEvent(new Event("timeScaled" /* TIME_SCALED */));
        }
        /**
         * Retrieves the current scaling of this time
         */
        getScale() {
            return this.scale;
        }
        /**
         * Retrieves the offset of this time
         */
        getOffset() {
            return this.offset;
        }
        /**
         * Retrieves the scaled time in milliseconds passed since the last call to this method
         * Automatically reset at every call to set(...) and setScale(...)
         */
        getElapsedSincePreviousCall() {
            let current = this.get();
            let elapsed = current - this.lastCallToElapsed;
            this.lastCallToElapsed = current;
            return elapsed;
        }
        //#region Timers
        // TODO: examine if web-workers would enhance performance here!
        /**
         * See Javascript documentation. Creates an internal [[Timer]] object
         * @param _callback
         * @param _timeout
         * @param _arguments
         */
        setTimeout(_callback, _timeout, ..._arguments) {
            return this.setTimer(TIMER_TYPE.TIMEOUT, _callback, _timeout, _arguments);
        }
        /**
         * See Javascript documentation. Creates an internal [[Timer]] object
         * @param _callback
         * @param _timeout
         * @param _arguments
         */
        setInterval(_callback, _timeout, ..._arguments) {
            return this.setTimer(TIMER_TYPE.INTERVAL, _callback, _timeout, _arguments);
        }
        /**
         * See Javascript documentation
         * @param _id
         */
        clearTimeout(_id) {
            this.deleteTimer(_id);
        }
        /**
         * See Javascript documentation
         * @param _id
         */
        clearInterval(_id) {
            this.deleteTimer(_id);
        }
        /**
         * Stops and deletes all [[Timer]]s attached. Should be called before this Time-object leaves scope
         */
        clearAllTimers() {
            for (let id in this.timers) {
                this.deleteTimer(Number(id));
            }
        }
        /**
         * Recreates [[Timer]]s when scaling changes
         */
        rescaleAllTimers() {
            for (let id in this.timers) {
                let timer = this.timers[id];
                timer.clear();
                if (!this.scale)
                    // Time has stopped, no need to replace cleared timers
                    continue;
                let timeout = timer.timeout;
                // if (timer.type == TIMER_TYPE.TIMEOUT && timer.active)
                //     // for an active timeout-timer, calculate the remaining time to timeout
                //     timeout = (performance.now() - timer.startTimeReal) / timer.timeoutReal;
                let replace = new Timer(this, timer.type, timer.callback, timeout, timer.arguments);
                this.timers[id] = replace;
            }
        }
        /**
         * Deletes [[Timer]] found using the id of the connected interval/timeout-object
         * @param _id
         */
        deleteTimerByInternalId(_id) {
            for (let id in this.timers) {
                let timer = this.timers[id];
                if (timer.id == _id) {
                    timer.clear();
                    delete this.timers[id];
                }
            }
        }
        setTimer(_type, _callback, _timeout, _arguments) {
            let timer = new Timer(this, _type, _callback, _timeout, _arguments);
            this.timers[++this.idTimerNext] = timer;
            return this.idTimerNext;
        }
        deleteTimer(_id) {
            this.timers[_id].clear();
            delete this.timers[_id];
        }
    }
    Time.gameTime = new Time();
    FudgeCore.Time = Time;
})(FudgeCore || (FudgeCore = {}));
///<reference path="../Event/Event.ts"/>
///<reference path="../Time/Time.ts"/>
var FudgeCore;
///<reference path="../Event/Event.ts"/>
///<reference path="../Time/Time.ts"/>
(function (FudgeCore) {
    let LOOP_MODE;
    (function (LOOP_MODE) {
        /** Loop cycles controlled by window.requestAnimationFrame */
        LOOP_MODE["FRAME_REQUEST"] = "frameRequest";
        /** Loop cycles with the given framerate in [[Time]].game */
        LOOP_MODE["TIME_GAME"] = "timeGame";
        /** Loop cycles with the given framerate in realtime, independent of [[Time]].game */
        LOOP_MODE["TIME_REAL"] = "timeReal";
    })(LOOP_MODE = FudgeCore.LOOP_MODE || (FudgeCore.LOOP_MODE = {}));
    /**
     * Core loop of a Fudge application. Initializes automatically and must be started explicitly.
     * It then fires [[EVENT]].LOOP\_FRAME to all added listeners at each frame
     */
    class Loop extends FudgeCore.EventTargetStatic {
        /**
         * Starts the loop with the given mode and fps
         * @param _mode
         * @param _fps Is only applicable in TIME-modes
         * @param _syncWithAnimationFrame Experimental and only applicable in TIME-modes. Should defer the loop-cycle until the next possible animation frame.
         */
        static start(_mode = LOOP_MODE.FRAME_REQUEST, _fps = 60, _syncWithAnimationFrame = false) {
            Loop.stop();
            Loop.timeStartGame = FudgeCore.Time.game.get();
            Loop.timeStartReal = performance.now();
            Loop.timeLastFrameGame = Loop.timeStartGame;
            Loop.timeLastFrameReal = Loop.timeStartReal;
            Loop.fpsDesired = (_mode == LOOP_MODE.FRAME_REQUEST) ? 60 : _fps;
            Loop.framesToAverage = Loop.fpsDesired;
            Loop.timeLastFrameGameAvg = Loop.timeLastFrameRealAvg = 1000 / Loop.fpsDesired;
            Loop.mode = _mode;
            Loop.syncWithAnimationFrame = _syncWithAnimationFrame;
            let log = `Loop starting in mode ${Loop.mode}`;
            if (Loop.mode != LOOP_MODE.FRAME_REQUEST)
                log += ` with attempted ${_fps} fps`;
            FudgeCore.Debug.log(log);
            switch (_mode) {
                case LOOP_MODE.FRAME_REQUEST:
                    Loop.loopFrame();
                    break;
                case LOOP_MODE.TIME_REAL:
                    Loop.idIntervall = window.setInterval(Loop.loopTime, 1000 / Loop.fpsDesired);
                    Loop.loopTime();
                    break;
                case LOOP_MODE.TIME_GAME:
                    Loop.idIntervall = FudgeCore.Time.game.setInterval(Loop.loopTime, 1000 / Loop.fpsDesired);
                    Loop.loopTime();
                    break;
                default:
                    break;
            }
            Loop.running = true;
        }
        /**
         * Stops the loop
         */
        static stop() {
            if (!Loop.running)
                return;
            switch (Loop.mode) {
                case LOOP_MODE.FRAME_REQUEST:
                    window.cancelAnimationFrame(Loop.idRequest);
                    break;
                case LOOP_MODE.TIME_REAL:
                    window.clearInterval(Loop.idIntervall);
                    window.cancelAnimationFrame(Loop.idRequest);
                    break;
                case LOOP_MODE.TIME_GAME:
                    // TODO: DANGER! id changes internally in game when time is scaled!
                    FudgeCore.Time.game.clearInterval(Loop.idIntervall);
                    window.cancelAnimationFrame(Loop.idRequest);
                    break;
                default:
                    break;
            }
            FudgeCore.Debug.log("Loop stopped!");
        }
        static getFpsGameAverage() {
            return 1000 / Loop.timeLastFrameGameAvg;
        }
        static getFpsRealAverage() {
            return 1000 / Loop.timeLastFrameRealAvg;
        }
        static loop() {
            let time;
            time = performance.now();
            Loop.timeFrameReal = time - Loop.timeLastFrameReal;
            Loop.timeLastFrameReal = time;
            time = FudgeCore.Time.game.get();
            Loop.timeFrameGame = time - Loop.timeLastFrameGame;
            Loop.timeLastFrameGame = time;
            Loop.timeLastFrameGameAvg = ((Loop.framesToAverage - 1) * Loop.timeLastFrameGameAvg + Loop.timeFrameGame) / Loop.framesToAverage;
            Loop.timeLastFrameRealAvg = ((Loop.framesToAverage - 1) * Loop.timeLastFrameRealAvg + Loop.timeFrameReal) / Loop.framesToAverage;
            let event = new Event("loopFrame" /* LOOP_FRAME */);
            Loop.targetStatic.dispatchEvent(event);
        }
        static loopFrame() {
            Loop.loop();
            Loop.idRequest = window.requestAnimationFrame(Loop.loopFrame);
        }
        static loopTime() {
            if (Loop.syncWithAnimationFrame)
                Loop.idRequest = window.requestAnimationFrame(Loop.loop);
            else
                Loop.loop();
        }
    }
    /** The gametime the loop was started, overwritten at each start */
    Loop.timeStartGame = 0;
    /** The realtime the loop was started, overwritten at each start */
    Loop.timeStartReal = 0;
    /** The gametime elapsed since the last loop cycle */
    Loop.timeFrameGame = 0;
    /** The realtime elapsed since the last loop cycle */
    Loop.timeFrameReal = 0;
    Loop.timeLastFrameGame = 0;
    Loop.timeLastFrameReal = 0;
    Loop.timeLastFrameGameAvg = 0;
    Loop.timeLastFrameRealAvg = 0;
    Loop.running = false;
    Loop.mode = LOOP_MODE.FRAME_REQUEST;
    Loop.idIntervall = 0;
    Loop.idRequest = 0;
    Loop.fpsDesired = 30;
    Loop.framesToAverage = 30;
    Loop.syncWithAnimationFrame = false;
    FudgeCore.Loop = Loop;
})(FudgeCore || (FudgeCore = {}));
var FudgeCore;
(function (FudgeCore) {
    /**
     * Handles file transfer from a Fudge-Browserapp to the local filesystem without a local server.
     * Saves to the download-path given by the browser, loads from the player's choice.
     */
    class FileIoBrowserLocal extends FudgeCore.EventTargetStatic {
        // TODO: refactor to async function to be handled using promise, instead of using event target
        static load() {
            FileIoBrowserLocal.selector = document.createElement("input");
            FileIoBrowserLocal.selector.type = "file";
            FileIoBrowserLocal.selector.multiple = true;
            FileIoBrowserLocal.selector.hidden = true;
            FileIoBrowserLocal.selector.addEventListener("change", FileIoBrowserLocal.handleFileSelect);
            document.body.appendChild(FileIoBrowserLocal.selector);
            FileIoBrowserLocal.selector.click();
        }
        // TODO: refactor to async function to be handled using promise, instead of using event target
        static save(_toSave) {
            for (let filename in _toSave) {
                let content = _toSave[filename];
                let blob = new Blob([content], { type: "text/plain" });
                let url = window.URL.createObjectURL(blob);
                //*/ using anchor element for download
                let downloader;
                downloader = document.createElement("a");
                downloader.setAttribute("href", url);
                downloader.setAttribute("download", filename);
                document.body.appendChild(downloader);
                downloader.click();
                document.body.removeChild(downloader);
                window.URL.revokeObjectURL(url);
            }
            let event = new CustomEvent("fileSaved" /* FILE_SAVED */, { detail: { mapFilenameToContent: _toSave } });
            FileIoBrowserLocal.targetStatic.dispatchEvent(event);
        }
        static async handleFileSelect(_event) {
            console.log("-------------------------------- handleFileSelect");
            document.body.removeChild(FileIoBrowserLocal.selector);
            let fileList = _event.target.files;
            console.log(fileList, fileList.length);
            if (fileList.length == 0)
                return;
            let loaded = {};
            await FileIoBrowserLocal.loadFiles(fileList, loaded);
            let event = new CustomEvent("fileLoaded" /* FILE_LOADED */, { detail: { mapFilenameToContent: loaded } });
            FileIoBrowserLocal.targetStatic.dispatchEvent(event);
        }
        static async loadFiles(_fileList, _loaded) {
            for (let file of _fileList) {
                const content = await new Response(file).text();
                _loaded[file.name] = content;
            }
        }
    }
    FudgeCore.FileIoBrowserLocal = FileIoBrowserLocal;
})(FudgeCore || (FudgeCore = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRnVkZ2VDb3JlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vU291cmNlL1RyYW5zZmVyL1NlcmlhbGl6ZXIudHMiLCIuLi9Tb3VyY2UvVHJhbnNmZXIvTXV0YWJsZS50cyIsIi4uL1NvdXJjZS9BbmltYXRpb24vQW5pbWF0aW9uLnRzIiwiLi4vU291cmNlL0FuaW1hdGlvbi9BbmltYXRpb25GdW5jdGlvbi50cyIsIi4uL1NvdXJjZS9BbmltYXRpb24vQW5pbWF0aW9uS2V5LnRzIiwiLi4vU291cmNlL0FuaW1hdGlvbi9BbmltYXRpb25TZXF1ZW5jZS50cyIsIi4uL1NvdXJjZS9BdWRpby9BdWRpby50cyIsIi4uL1NvdXJjZS9BdWRpby9BdWRpb0RlbGF5LnRzIiwiLi4vU291cmNlL0F1ZGlvL0F1ZGlvRmlsdGVyLnRzIiwiLi4vU291cmNlL0F1ZGlvL0F1ZGlvTG9jYWxpc2F0aW9uLnRzIiwiLi4vU291cmNlL0F1ZGlvL0F1ZGlvT3NjaWxsYXRvci50cyIsIi4uL1NvdXJjZS9BdWRpby9BdWRpb1Nlc3Npb25EYXRhLnRzIiwiLi4vU291cmNlL0F1ZGlvL0F1ZGlvU2V0dGluZ3MudHMiLCIuLi9Tb3VyY2UvUmVuZGVyL1JlbmRlckluamVjdG9yLnRzIiwiLi4vU291cmNlL1JlbmRlci9SZW5kZXJPcGVyYXRvci50cyIsIi4uL1NvdXJjZS9Db2F0L0NvYXQudHMiLCIuLi9Tb3VyY2UvQ29tcG9uZW50L0NvbXBvbmVudC50cyIsIi4uL1NvdXJjZS9Db21wb25lbnQvQ29tcG9uZW50QW5pbWF0b3IudHMiLCIuLi9Tb3VyY2UvQ29tcG9uZW50L0NvbXBvbmVudEF1ZGlvLnRzIiwiLi4vU291cmNlL0NvbXBvbmVudC9Db21wb25lbnRBdWRpb0xpc3RlbmVyLnRzIiwiLi4vU291cmNlL0NvbXBvbmVudC9Db21wb25lbnRDYW1lcmEudHMiLCIuLi9Tb3VyY2UvTGlnaHQvTGlnaHQudHMiLCIuLi9Tb3VyY2UvQ29tcG9uZW50L0NvbXBvbmVudExpZ2h0LnRzIiwiLi4vU291cmNlL0NvbXBvbmVudC9Db21wb25lbnRNYXRlcmlhbC50cyIsIi4uL1NvdXJjZS9Db21wb25lbnQvQ29tcG9uZW50TWVzaC50cyIsIi4uL1NvdXJjZS9Db21wb25lbnQvQ29tcG9uZW50U2NyaXB0LnRzIiwiLi4vU291cmNlL0NvbXBvbmVudC9Db21wb25lbnRUcmFuc2Zvcm0udHMiLCIuLi9Tb3VyY2UvRGVidWcvRGVidWdJbnRlcmZhY2VzLnRzIiwiLi4vU291cmNlL0RlYnVnL0RlYnVnVGFyZ2V0LnRzIiwiLi4vU291cmNlL0RlYnVnL0RlYnVnQWxlcnQudHMiLCIuLi9Tb3VyY2UvRGVidWcvRGVidWdDb25zb2xlLnRzIiwiLi4vU291cmNlL0RlYnVnL0RlYnVnLnRzIiwiLi4vU291cmNlL0RlYnVnL0RlYnVnRGlhbG9nLnRzIiwiLi4vU291cmNlL0RlYnVnL0RlYnVnVGV4dEFyZWEudHMiLCIuLi9Tb3VyY2UvRW5naW5lL0NvbG9yLnRzIiwiLi4vU291cmNlL0VuZ2luZS9NYXRlcmlhbC50cyIsIi4uL1NvdXJjZS9FbmdpbmUvUmVjeWNsZXIudHMiLCIuLi9Tb3VyY2UvRW5naW5lL1Jlc291cmNlTWFuYWdlci50cyIsIi4uL1NvdXJjZS9FbmdpbmUvVmlld3BvcnQudHMiLCIuLi9Tb3VyY2UvRXZlbnQvRXZlbnQudHMiLCIuLi9Tb3VyY2UvRXZlbnQvRXZlbnRLZXlib2FyZC50cyIsIi4uL1NvdXJjZS9NYXRoL0ZyYW1pbmcudHMiLCIuLi9Tb3VyY2UvTWF0aC9NYXRyaXgzeDMudHMiLCIuLi9Tb3VyY2UvTWF0aC9NYXRyaXg0eDQudHMiLCIuLi9Tb3VyY2UvTWF0aC9SZWN0YW5nbGUudHMiLCIuLi9Tb3VyY2UvTWF0aC9WZWN0b3IyLnRzIiwiLi4vU291cmNlL01hdGgvVmVjdG9yMy50cyIsIi4uL1NvdXJjZS9NZXNoL01lc2gudHMiLCIuLi9Tb3VyY2UvTWVzaC9NZXNoQ3ViZS50cyIsIi4uL1NvdXJjZS9NZXNoL01lc2hQeXJhbWlkLnRzIiwiLi4vU291cmNlL01lc2gvTWVzaFF1YWQudHMiLCIuLi9Tb3VyY2UvTm9kZS9Ob2RlLnRzIiwiLi4vU291cmNlL05vZGUvTm9kZVJlc291cmNlLnRzIiwiLi4vU291cmNlL05vZGUvTm9kZVJlc291cmNlSW5zdGFuY2UudHMiLCIuLi9Tb3VyY2UvUmF5L1JheS50cyIsIi4uL1NvdXJjZS9SYXkvUmF5SGl0LnRzIiwiLi4vU291cmNlL1JlbmRlci9SZW5kZXJNYW5hZ2VyLnRzIiwiLi4vU291cmNlL1NoYWRlci9TaGFkZXIudHMiLCIuLi9Tb3VyY2UvU2hhZGVyL1NoYWRlckZsYXQudHMiLCIuLi9Tb3VyY2UvU2hhZGVyL1NoYWRlck1hdENhcC50cyIsIi4uL1NvdXJjZS9TaGFkZXIvU2hhZGVyUmF5Q2FzdC50cyIsIi4uL1NvdXJjZS9TaGFkZXIvU2hhZGVyVGV4dHVyZS50cyIsIi4uL1NvdXJjZS9TaGFkZXIvU2hhZGVyVW5pQ29sb3IudHMiLCIuLi9Tb3VyY2UvVGV4dHVyZS9UZXh0dXJlLnRzIiwiLi4vU291cmNlL1RpbWUvVGltZS50cyIsIi4uL1NvdXJjZS9UaW1lL0xvb3AudHMiLCIuLi9Tb3VyY2UvVHJhbnNmZXIvRmlsZUlvQnJvd3NlckxvY2FsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBQSxJQUFVLFNBQVMsQ0F1TGxCO0FBdkxELFdBQVUsU0FBUztJQWdCZjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O09BMkJHO0lBQ0gsTUFBc0IsVUFBVTtRQUk1Qjs7O1dBR0c7UUFDSSxNQUFNLENBQUMsaUJBQWlCLENBQUMsVUFBa0I7WUFDOUMsS0FBSyxJQUFJLElBQUksSUFBSSxVQUFVLENBQUMsVUFBVTtnQkFDbEMsSUFBSSxVQUFVLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLFVBQVU7b0JBQ3pDLE9BQU87WUFFZixJQUFJLElBQUksR0FBVyxVQUFVLENBQUMsZUFBZSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUNsRSxJQUFJLENBQUMsSUFBSTtnQkFDTCxLQUFLLElBQUks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LE1BQU0sS0FBSyxLQUFLO1lBQ25CLE9BQU8sSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDakMsQ0FBQztRQUNNLE1BQU0sS0FBSyxHQUFHO1lBQ2pCLE9BQU8sSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDakMsQ0FBQztRQUNNLE1BQU0sS0FBSyxLQUFLO1lBQ25CLE9BQU8sSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDakMsQ0FBQztRQUNNLE1BQU0sS0FBSyxJQUFJO1lBQ2xCLE9BQU8sSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDakMsQ0FBQztRQUNNLE1BQU0sS0FBSyxNQUFNO1lBQ3BCLE9BQU8sSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDakMsQ0FBQztRQUNNLE1BQU0sS0FBSyxJQUFJO1lBQ2xCLE9BQU8sSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDakMsQ0FBQztRQUNNLE1BQU0sS0FBSyxPQUFPO1lBQ3JCLE9BQU8sSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDakMsQ0FBQztRQUVNLFdBQVcsQ0FBQyxFQUFVLEVBQUUsRUFBVSxFQUFFLEVBQVUsRUFBRSxFQUFVO1lBQzdELElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN0QyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FB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LENBQUMsQ0FBQyxDQUFDO1lBQ3JDLElBQUksR0FBRyxHQUFXLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNyQyxJQUFJLEdBQUcsR0FBVyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDckMsSUFBSSxHQUFHLEdBQVcsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3JDLElBQUksR0FBRyxHQUFXLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNyQyxJQUFJLEdBQUcsR0FBVyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDckMsSUFBSSxHQUFHLEdBQVcsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3JDLElBQUksR0FBRyxHQUFXLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNyQyxJQUFJLEdBQUcsR0FBVyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDckMsSUFBSSxHQUFHLEdBQVcsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3JDLElBQUksR0FBRyxHQUFXLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNyQyxJQUFJLEdBQUcsR0FBVyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDckMsSUFBSSxHQUFHLEdBQVcsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3JDLElBQUksR0FBRyxHQUFXLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNyQyxJQUFJLEdBQUcsR0FBVyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDckMsSUFBSSxHQUFHLEdBQVcsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3JDLElBQUksR0FBRyxHQUFXLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNyQyxJQUFJLEdBQUcsR0FBVyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDckMsSUFBSSxNQUFNLEdBQWMsSUFBSSxTQUFTLENBQUM7WUFDdEMsTUFBTSxDQUFDLElBQUksR0FBRztnQkFDVixHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUc7Z0JBQ2pDLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRztnQkFDakMsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHO2dCQUNqQyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUc7Z0JBQ2pDLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRztnQkFDakMsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHO2dCQUNqQyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdB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LElBQUksQ0FBQyxHQUFpQixFQUFFLENBQUMsSUFBSSxDQUFDO1lBQzlCLDJDQUEyQztZQUMzQyxNQUFNLE1BQU0sR0FBYyxVQUFBLFFBQVEsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDbEQsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQ2I7Z0JBQ0UsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUc7Z0JBQzdDLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHO2dCQUM3QyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRztnQkFDN0MsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUc7Z0JBQzdDLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHO2dCQUM3QyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRztnQkFDN0MsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUc7Z0JBQzdDLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHO2dCQUM3QyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRztnQkFDN0MsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUc7Z0JBQzdDLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHO2dCQUM3QyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRztnQkFDN0MsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUc7Z0JBQzdDLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHO2dCQUM3QyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRztnQkFDN0MsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUc7YUFDOUMsQ0FBQyxDQUFDO1lBQ0wsT0FBTyxNQUFNLENBQUM7UUFDaEIsQ0FBQztRQUVEOzs7V0FHRztRQUNJLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBa0I7WUFDeEMsSUFBSSxDQUFDLEdBQWlCLE9BQU8sQ0FBQyxJQUFJLENBQUM7WUFDbkMsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxJQUFJLEdBQVcsR0FBRyxHQUFHLEdBQUcsQ0FBQztZQUM3QixJQUFJLElBQUksR0FBVyxHQUFHLEdBQUcsR0FBRyxDQUFDO1lBQzdCLElBQUksSUFBSSxHQUFXLEdBQUcsR0FBRyxHQUFHLENBQUM7WUFDN0IsSUFBSSxJQUFJLEdBQVcsR0FBRyxHQUFHLEdBQUcsQ0FBQztZQUM3QixJQUFJLElBQUksR0FBVyxHQUFHLEdBQUcsR0FBRyxDQUFDO1lBQzdCLElBQUksSUFBSSxHQUFXLEdBQUcsR0FBRyxHQUFHLENBQUM7WUFDN0IsSUFBSSxJQUFJLEdBQVcsR0FBRyxHQUFHLEdBQUcsQ0FBQztZQUM3QixJQUFJLElBQUksR0FBVyxHQUFHLEdBQUcsR0FBRyxDQUFDO1lBQzdCLElBQUksSUFBSSxHQUFXLEdBQUcsR0FBRyxHQUFHLENBQUM7WUFDN0IsSUFBSSxJQUFJLEdBQVcsR0FBRyxHQUFHLEdBQUcsQ0FBQztZQUM3QixJQUFJLEtBQUssR0FBVyxHQUFHLEdBQUcsR0FBRyxDQUFDO1lBQzlCLElBQUksS0FBSyxHQUFXLEdBQUcsR0FBRyxHQUFHLENBQUM7WUFDOUIsSUFBSSxLQUFLLEdBQVcsR0FBRyxHQUFHLEdBQUcsQ0FBQztZQUM5QixJQUFJLEtBQUssR0FBVyxHQUFHLEdBQUcsR0FBRyxDQUFDO1lBQzlCLElBQUksS0FBSyxHQUFXLEdBQUcsR0FBRyxHQUFHLENBQUM7WUFDOUIsSUFBSSxLQUFLLEdBQVcsR0FBRyxHQUFHLEdBQUcsQ0FBQztZQUM5QixJQUFJLEtBQUssR0FBVyxHQUFHLEdBQUcsR0FBRyxDQUFDO1lBQzlCLElBQUksS0FBSyxHQUFXLEdBQUcsR0FBRyxHQUFHLENBQUM7WUFDOUIsSUFBSSxLQUFLLEdBQVcsR0FBRyxHQUFHLEdBQUcsQ0FBQztZQUM5QixJQUFJLEtBQUssR0FBVyxHQUFHLEdBQUcsR0FBRyxDQUFDO1lBQzlCLElBQUksS0FBSyxHQUFXLEdBQUcsR0FBRyxHQUFHLENBQUM7WUFDOUIsSUFBSSxLQUFLLEdBQVcsR0FBRyxHQUFHLEdBQUcsQ0FBQztZQUM5QixJQUFJLEtBQUssR0FBVyxHQUFHLEdBQUcsR0FBRyxDQUFDO1lBQzlCLElBQUksS0FBSyxHQUFXLEdBQUcsR0FBRyxHQUFHLENBQUM7WUFFOUIsSUFBSSxFQUFFLEdBQVcsQ0FBQyxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsQ0FBQztnQkFDckQsQ0FBQyxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDO1lBRXpDLElBQUksRUFBRSxHQUFXLENBQUMsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLENBQUM7Z0JBQ3JELENBQUMsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQztZQUN6QyxJQUFJLEVBQUUsR0FBVyxDQUFDLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsR0FBRyxDQUFDO2dCQUN0RCxDQUFDLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsR0FBRyxDQUFDLENBQUM7WUFDMUMsSUFBSSxFQUFFLEdBQVcsQ0FBQyxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsS0FBSyxHQUFHLEdBQUcsQ0FBQztnQkFDdEQsQ0FBQyxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsS0FBSyxHQUFHLEdBQUcsQ0FBQyxDQUFDO1lBRTFDLElBQUksQ0FBQyxHQUFXLEdBQUcsR0FBRyxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsR0FBRyxHQUFHLEVBQUUsR0FBRyxHQUFHLEdBQUcsRUFBRSxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQztZQUVsRSx5Q0FBeUM7WUFDekMsTUFBTSxNQUFNLEdBQWMsVUFBQSxRQUFRLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ2xELE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO2dCQUNkLENBQUMsR0FBRyxFQUFFO2dCQUNOLENBQUMsR0FBRyxFQUFFO2dCQUNOLENBQUMsR0FBRyxFQUFFO2dCQUNOLENBQUMsR0FBRyxFQUFFO2dCQUNOLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUM7Z0JBQ3JGLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUM7Z0JBQ3JGLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLEtBQUssR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsR0FBRyxDQUFDLENBQUM7Z0JBQ3ZGLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLEtBQUssR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsR0FBRyxDQUFDLENBQUM7Z0JBQ3ZGLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsR0FBRyxHQUFHLEtBQUssR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxHQUFHLEdBQUcsS0FBSyxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsR0FBRyxDQUFDLENBQUM7Z0JBQzNGLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsR0FBRyxHQUFHLEtBQUssR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxHQUFHLEdBQUcsS0FBSyxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsR0FBRyxDQUFDLENBQUM7Z0JBQzNGLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsR0FBRyxHQUFHLEtBQUssR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxHQUFHLEdBQUcsS0FBSyxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsR0FBRyxDQUFDLENBQUM7Z0JBQzNGLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsR0FBRyxHQUFHLEtBQUssR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxHQUFHLEdBQUcsS0FBSyxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsR0FBRyxDQUFDLENBQUM7Z0JBQzNGLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsR0FBRyxHQUFHLEtBQUssR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFD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QTZCO1lBQzVFLEtBQUssSUFBSSxJQUFJLElBQUksU0FBUyxFQUFFO2dCQUN4QixNQUFNLE9BQU8sR0FBVyxNQUFNLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUN4RCxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQzthQUNoQztRQUNMLENBQUM7S0FDSjtJQXZEWSw0QkFBa0IscUJBdUQ5QixDQUFBO0FBQ0wsQ0FBQyxFQWhFUyxTQUFTLEtBQVQsU0FBUyxRQWdFbEIiLCJzb3VyY2VzQ29udGVudCI6WyJuYW1lc3BhY2UgRnVkZ2VDb3JlIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWFueVxuICAgIGV4cG9ydCB0eXBlIEdlbmVyYWwgPSBhbnk7XG5cbiAgICBleHBvcnQgaW50ZXJmYWNlIFNlcmlhbGl6YXRpb24ge1xuICAgICAgICBbdHlwZTogc3RyaW5nXTogR2VuZXJhbDtcbiAgICB9XG4gICAgZXhwb3J0IGludGVyZmFjZSBTZXJpYWxpemFibGUge1xuICAgICAgICBzZXJpYWxpemUoKTogU2VyaWFsaXphdGlvbjtcbiAgICAgICAgZGVzZXJpYWxpemUoX3NlcmlhbGl6YXRpb246IFNlcmlhbGl6YXRpb24pOiBTZXJpYWxpemFibGU7XG4gICAgfVxuXG4gICAgaW50ZXJmYWNlIE5hbWVzcGFjZVJlZ2lzdGVyIHtcbiAgICAgICAgW25hbWU6IHN0cmluZ106IE9iamVjdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGVzIHRoZSBleHRlcm5hbCBzZXJpYWxpemF0aW9uIGFuZCBkZXNlcmlhbGl6YXRpb24gb2YgW1tTZXJpYWxpemFibGVdXSBvYmplY3RzLiBUaGUgaW50ZXJuYWwgcHJvY2VzcyBpcyBoYW5kbGVkIGJ5IHRoZSBvYmplY3RzIHRoZW1zZWx2ZXMuICBcbiAgICAgKiBBIFtbU2VyaWFsaXphdGlvbl1dIG9iamVjdCBjYW4gYmUgY3JlYXRlZCBmcm9tIGEgW1tTZXJpYWxpemFibGVdXSBvYmplY3QgYW5kIGEgSlNPTi1TdHJpbmcgbWF5IGJlIGNyZWF0ZWQgZnJvbSB0aGF0LiAgXG4gICAgICogVmljZSB2ZXJzYSwgYSBKU09OLVN0cmluZyBjYW4gYmUgcGFyc2VkIHRvIGEgW1tTZXJpYWxpemF0aW9uXV0gd2hpY2ggY2FuIGJlIGRlc2VyaWFsaXplZCB0byBhIFtbU2VyaWFsaXphYmxlXV0gb2JqZWN0LlxuICAgICAqIGBgYHBsYWludGV4dFxuICAgICAqICBbU2VyaWFsaXphYmxlXSDihpIgKHNlcmlhbGl6ZSkg4oaSIFtTZXJpYWxpemF0aW9uXSDihpIgKHN0cmluZ2lmeSkgIFxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICDihpNcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbU3RyaW5nXVxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICDihpNcbiAgICAgKiAgW1NlcmlhbGl6YWJsZV0g4oaQIChkZXNlcmlhbGl6ZSkg4oaQIFtTZXJpYWxpemF0aW9uXSDihpAgKHBhcnNlKVxuICAgICAqIGBgYCAgICAgIFxuICAgICAqIFdoaWxlIHRoZSBpbnRlcm5hbCBzZXJpYWxpemUvZGVzZXJpYWxpemUgbWV0aG9kcyBvZiB0aGUgb2JqZWN0cyBjYXJlIG9mIHRoZSBzZWxlY3Rpb24gb2YgaW5mb3JtYXRpb24gbmVlZGVkIHRvIHJlY3JlYXRlIHRoZSBvYmplY3QgYW5kIGl0cyBzdHJ1Y3R1cmUsICBcbiAgICAgKiB0aGUgW1tTZXJpYWxpemVyXV0ga2VlcHMgdHJhY2sgb2YgdGhlIG5hbWVzcGFjZXMgYW5kIGNsYXNzZXMgaW4gb3JkZXIgdG8gcmVjcmVhdGUgW1tTZXJpYWxpemFibGVdXSBvYmplY3RzLiBUaGUgZ2VuZXJhbCBzdHJ1Y3R1cmUgb2YgYSBbW1NlcmlhbGl6YXRpb25dXSBpcyBhcyBmb2xsb3dzICBcbiAgICAgKiBgYGBwbGFpbnRleHRcbiAgICAgKiB7XG4gICAgICogICAgICBuYW1lc3BhY2VOYW1lLmNsYXNzTmFtZToge1xuICAgICAqICAgICAgICAgIHByb3BlcnR5TmFtZTogcHJvcGVydHlWYWx1ZSxcbiAgICAgKiAgICAgICAgICAuLi4sXG4gICAgICogICAgICAgICAgcHJvcGVydHlOYW1lT2ZSZWZlcmVuY2U6IFNlcmlhbGl6YXRpb25PZlRoZVJlZmVyZW5jZWRPYmplY3QsXG4gICAgICogICAgICAgICAgLi4uLFxuICAgICAqICAgICAgICAgIGNvbnN0cnVjdG9yTmFtZU9mU3VwZXJjbGFzczogU2VyaWFsaXphdGlvbk9mU3VwZXJDbGFzc1xuICAgICAqICAgICAgfVxuICAgICAqIH1cbiAgICAgKiBgYGBcbiAgICAgKiBTaW5jZSB0aGUgaW5zdGFuY2Ugb2YgdGhlIHN1cGVyY2xhc3MgaXMgY3JlYXRlZCBhdXRvbWF0aWNhbGx5IHdoZW4gYW4gb2JqZWN0IGlzIGNyZWF0ZWQsIFxuICAgICAqIHRoZSBTZXJpYWxpemF0aW9uT2ZTdXBlckNsYXNzIG9taXRzIHRoZSB0aGUgbmFtZXNwYWNlTmFtZS5jbGFzc05hbWUga2V5IGFuZCBjb25zaXN0cyBvbmx5IG9mIGl0cyB2YWx1ZS4gXG4gICAgICogVGhlIGNvbnN0cnVjdG9yTmFtZU9mU3VwZXJjbGFzcyBpcyBnaXZlbiBpbnN0ZWFkIGFzIGEgcHJvcGVydHkgbmFtZSBpbiB0aGUgc2VyaWFsaXphdGlvbiBvZiB0aGUgc3ViY2xhc3MuXG4gICAgICovXG4gICAgZXhwb3J0IGFic3RyYWN0IGNsYXNzIFNlcmlhbGl6ZXIge1xuICAgICAgICAvKiogSW4gb3JkZXIgZm9yIHRoZSBTZXJpYWxpemVyIHRvIGNyZWF0ZSBjbGFzcyBpbnN0YW5jZXMsIGl0IG5lZWRzIGFjY2VzcyB0byB0aGUgYXBwcm9wcmlhdGUgbmFtZXNwYWNlcyAqL1xuICAgICAgICBwcml2YXRlIHN0YXRpYyBuYW1lc3BhY2VzOiBOYW1lc3BhY2VSZWdpc3RlciA9IHsgXCLGklwiOiBGdWRnZUNvcmUgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmVnaXN0ZXJzIGEgbmFtZXNwYWNlIHRvIHRoZSBbW1NlcmlhbGl6ZXJdXSwgdG8gZW5hYmxlIGF1dG9tYXRpYyBpbnN0YW50aWF0aW9uIG9mIGNsYXNzZXMgZGVmaW5lZCB3aXRoaW5cbiAgICAgICAgICogQHBhcmFtIF9uYW1lc3BhY2UgXG4gICAgICAgICAqL1xuICAgICAgICBwdWJsaWMgc3RhdGljIHJlZ2lzdGVyTmFtZXNwYWNlKF9uYW1lc3BhY2U6IE9iamVjdCk6IHZvaWQge1xuICAgICAgICAgICAgZm9yIChsZXQgbmFtZSBpbiBTZXJpYWxpemVyLm5hbWVzcGFjZXMpXG4gICAgICAgICAgICAgICAgaWYgKFNlcmlhbGl6ZXIubmFtZXNwYWNlc1tuYW1lXSA9PSBfbmFtZXNwYWNlKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgICAgIGxldCBuYW1lOiBzdHJpbmcgPSBTZXJpYWxpemVyLmZpbmROYW1lc3BhY2VJbihfbmFtZXNwYWNlLCB3aW5kb3cpO1xuICAgICAgICAgICAgaWYgKCFuYW1lKVxuICAgICAgICAgICAgICAgIGZvciAobGV0IHBhcmVudE5hbWUgaW4gU2VyaWFsaXplci5uYW1lc3BhY2VzKSB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWUgPSBTZXJpYWxpemVyLmZpbmROYW1lc3BhY2VJbihfbmFtZXNwYWNlLCBTZXJpYWxpemVyLm5hbWVzcGFjZXNbcGFyZW50TmFtZV0pO1xuICAgICAgICAgICAgICAgICAgICBpZiAobmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZSA9IHBhcmVudE5hbWUgKyBcIi5cIiArIG5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFuYW1lKVxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk5hbWVzcGFjZSBub3QgZm91bmQuIE1heWJlIHBhcmVudCBuYW1lc3BhY2UgaGFzbid0IGJlZW4gcmVnaXN0ZXJlZCBiZWZvcmU/XCIpO1xuXG4gICAgICAgICAgICBTZXJpYWxpemVyLm5hbWVzcGFjZXNbbmFtZV0gPSBfbmFtZXNwYWNlO1xuICAgICAgICB9XG5cblxuICAgICAgICAvKipcbiAgICAgICAgICogUmV0dXJucyBhIGphdmFzY3JpcHQgb2JqZWN0IHJlcHJlc2VudGluZyB0aGUgc2VyaWFsaXphYmxlIEZVREdFLW9iamVjdCBnaXZlbixcbiAgICAgICAgICogaW5jbHVkaW5nIGF0dGFjaGVkIGNvbXBvbmVudHMsIGNoaWxkcmVuLCBzdXBlcmNsYXNzLW9iamVjdHMgYWxsIGluZm9ybWF0aW9uIG5lZWRlZCBmb3IgcmVjb25zdHJ1Y3Rpb25cbiAgICAgICAgICogQHBhcmFtIF9vYmplY3QgQW4gb2JqZWN0IHRvIHNlcmlhbGl6ZSwgaW1wbGVtZW50aW5nIHRoZSBbW1NlcmlhbGl6YWJsZV1dIGludGVyZmFjZVxuICAgICAgICAgKi9cbiAgICAgICAgcHVibGljIHN0YXRpYyBzZXJpYWxpemUoX29iamVjdDogU2VyaWFsaXphYmxlKTogU2VyaWFsaXphdGlvbiB7XG4gICAgICAgICAgICBsZXQgc2VyaWFsaXphdGlvbjogU2VyaWFsaXphdGlvbiA9IHt9O1xuICAgICAgICAgICAgLy8gVE9ETzogc2F2ZSB0aGUgbmFtZXNwYWNlIHdpdGggdGhlIGNvbnN0cnVjdG9ycyBuYW1lXG4gICAgICAgICAgICAvLyBzZXJpYWxpemF0aW9uW19vYmplY3QuY29uc3RydWN0b3IubmFtZV0gPSBfb2JqZWN0LnNlcmlhbGl6ZSgpO1xuICAgICAgICAgICAgbGV0IHBhdGg6IHN0cmluZyA9IHRoaXMuZ2V0RnVsbFBhdGgoX29iamVjdCk7XG4gICAgICAgICAgICBpZiAoIXBhdGgpXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBOYW1lc3BhY2Ugb2Ygc2VyaWFsaXphYmxlIG9iamVjdCBvZiB0eXBlICR7X29iamVjdC5jb25zdHJ1Y3Rvci5uYW1lfSBub3QgZm91bmQuIE1heWJlIHRoZSBuYW1lc3BhY2UgaGFzbid0IGJlZW4gcmVnaXN0ZXJlZCBvciB0aGUgY2xhc3Mgbm90IGV4cG9ydGVkP2ApO1xuICAgICAgICAgICAgc2VyaWFsaXphdGlvbltwYXRoXSA9IF9vYmplY3Quc2VyaWFsaXplKCk7XG4gICAgICAgICAgICByZXR1cm4gc2VyaWFsaXphdGlvbjtcbiAgICAgICAgICAgIC8vIHJldHVybiBfb2JqZWN0LnNlcmlhbGl6ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJldHVybnMgYSBGVURHRS1vYmplY3QgcmVjb25zdHJ1Y3RlZCBmcm9tIHRoZSBpbmZvcm1hdGlvbiBpbiB0aGUgW1tTZXJpYWxpemF0aW9uXV0gZ2l2ZW4sXG4gICAgICAgICAqIGluY2x1ZGluZyBhdHRhY2hlZCBjb21wb25lbnRzLCBjaGlsZHJlbiwgc3VwZXJjbGFzcy1vYmplY3RzXG4gICAgICAgICAqIEBwYXJhbSBfc2VyaWFsaXphdGlvbiBcbiAgICAgICAgICovXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgZGVzZXJpYWxpemUoX3NlcmlhbGl6YXRpb246IFNlcmlhbGl6YXRpb24pOiBTZXJpYWxpemFibGUge1xuICAgICAgICAgICAgbGV0IHJlY29uc3RydWN0OiBTZXJpYWxpemFibGU7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIC8vIGxvb3AgY29uc3RydWN0ZWQgc29sZWx5IHRvIGFjY2VzcyB0eXBlLXByb3BlcnR5LiBPbmx5IG9uZSBleHBlY3RlZCFcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBwYXRoIGluIF9zZXJpYWxpemF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHJlY29uc3RydWN0ID0gbmV3ICg8R2VuZXJhbD5GdWRnZSlbdHlwZU5hbWVdO1xuICAgICAgICAgICAgICAgICAgICByZWNvbnN0cnVjdCA9IFNlcmlhbGl6ZXIucmVjb25zdHJ1Y3QocGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIHJlY29uc3RydWN0LmRlc2VyaWFsaXplKF9zZXJpYWxpemF0aW9uW3BhdGhdKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlY29uc3RydWN0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKG1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJEZXNlcmlhbGl6YXRpb24gZmFpbGVkOiBcIiArIG1lc3NhZ2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICAvL1RPRE86IGltcGxlbWVudCBwcmV0dGlmaWVyIHRvIG1ha2UgSlNPTi1TdHJpbmdpZmljYXRpb24gb2Ygc2VyaWFsaXphdGlvbnMgbW9yZSByZWFkYWJsZSwgZS5nLiBwbGFjaW5nIHgsIHkgYW5kIHogaW4gb25lIGxpbmVcbiAgICAgICAgcHVibGljIHN0YXRpYyBwcmV0dGlmeShfanNvbjogc3RyaW5nKTogc3RyaW5nIHsgcmV0dXJuIF9qc29uOyB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJldHVybnMgYSBmb3JtYXR0ZWQsIGh1bWFuIHJlYWRhYmxlIEpTT04tU3RyaW5nLCByZXByZXNlbnRpbmcgdGhlIGdpdmVuIFtbU2VyaWFsaXphaW9uXV0gdGhhdCBtYXkgaGF2ZSBiZWVuIGNyZWF0ZWQgYnkgW1tTZXJpYWxpemVyXV0uc2VyaWFsaXplXG4gICAgICAgICAqIEBwYXJhbSBfc2VyaWFsaXphdGlvblxuICAgICAgICAgKi9cbiAgICAgICAgcHVibGljIHN0YXRpYyBzdHJpbmdpZnkoX3NlcmlhbGl6YXRpb246IFNlcmlhbGl6YXRpb24pOiBzdHJpbmcge1xuICAgICAgICAgICAgLy8gYWRqdXN0bWVudHMgdG8gc2VyaWFsaXphdGlvbiBjYW4gYmUgbWFkZSBoZXJlIGJlZm9yZSBzdHJpbmdpZmljYXRpb24sIGlmIGRlc2lyZWRcbiAgICAgICAgICAgIGxldCBqc29uOiBzdHJpbmcgPSBKU09OLnN0cmluZ2lmeShfc2VyaWFsaXphdGlvbiwgbnVsbCwgMik7XG4gICAgICAgICAgICBsZXQgcHJldHR5OiBzdHJpbmcgPSBTZXJpYWxpemVyLnByZXR0aWZ5KGpzb24pO1xuICAgICAgICAgICAgcmV0dXJuIHByZXR0eTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZXR1cm5zIGEgW1tTZXJpYWxpemF0aW9uXV0gY3JlYXRlZCBmcm9tIHRoZSBnaXZlbiBKU09OLVN0cmluZy4gUmVzdWx0IG1heSBiZSBwYXNzZWQgdG8gW1tTZXJpYWxpemVyXV0uZGVzZXJpYWxpemVcbiAgICAgICAgICogQHBhcmFtIF9qc29uIFxuICAgICAgICAgKi9cbiAgICAgICAgcHVibGljIHN0YXRpYyBwYXJzZShfanNvbjogc3RyaW5nKTogU2VyaWFsaXphdGlvbiB7XG4gICAgICAgICAgICByZXR1cm4gSlNPTi5wYXJzZShfanNvbik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDcmVhdGVzIGFuIG9iamVjdCBvZiB0aGUgY2xhc3MgZGVmaW5lZCB3aXRoIHRoZSBmdWxsIHBhdGggaW5jbHVkaW5nIHRoZSBuYW1lc3BhY2VOYW1lKHMpIGFuZCB0aGUgY2xhc3NOYW1lIHNlcGVyYXRlZCBieSBkb3RzKC4pIFxuICAgICAgICAgKiBAcGFyYW0gX3BhdGggXG4gICAgICAgICAqL1xuICAgICAgICBwcml2YXRlIHN0YXRpYyByZWNvbnN0cnVjdChfcGF0aDogc3RyaW5nKTogU2VyaWFsaXphYmxlIHtcbiAgICAgICAgICAgIGxldCB0eXBlTmFtZTogc3RyaW5nID0gX3BhdGguc3Vic3RyKF9wYXRoLmxhc3RJbmRleE9mKFwiLlwiKSArIDEpO1xuICAgICAgICAgICAgbGV0IG5hbWVzcGFjZTogT2JqZWN0ID0gU2VyaWFsaXplci5nZXROYW1lc3BhY2UoX3BhdGgpO1xuICAgICAgICAgICAgaWYgKCFuYW1lc3BhY2UpXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBOYW1lc3BhY2Ugb2Ygc2VyaWFsaXphYmxlIG9iamVjdCBvZiB0eXBlICR7dHlwZU5hbWV9IG5vdCBmb3VuZC4gTWF5YmUgdGhlIG5hbWVzcGFjZSBoYXNuJ3QgYmVlbiByZWdpc3RlcmVkP2ApO1xuICAgICAgICAgICAgbGV0IHJlY29uc3RydWN0aW9uOiBTZXJpYWxpemFibGUgPSBuZXcgKDxHZW5lcmFsPm5hbWVzcGFjZSlbdHlwZU5hbWVdO1xuICAgICAgICAgICAgcmV0dXJuIHJlY29uc3RydWN0aW9uO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJldHVybnMgdGhlIGZ1bGwgcGF0aCB0byB0aGUgY2xhc3Mgb2YgdGhlIG9iamVjdCwgaWYgZm91bmQgaW4gdGhlIHJlZ2lzdGVyZWQgbmFtZXNwYWNlc1xuICAgICAgICAgKiBAcGFyYW0gX29iamVjdCBcbiAgICAgICAgICovXG4gICAgICAgIHByaXZhdGUgc3RhdGljIGdldEZ1bGxQYXRoKF9vYmplY3Q6IFNlcmlhbGl6YWJsZSk6IHN0cmluZyB7XG4gICAgICAgICAgICBsZXQgdHlwZU5hbWU6IHN0cmluZyA9IF9vYmplY3QuY29uc3RydWN0b3IubmFtZTtcbiAgICAgICAgICAgIC8vIERlYnVnLmxvZyhcIlNlYXJjaGluZyBuYW1lc3BhY2Ugb2Y6IFwiICsgdHlwZU5hbWUpO1xuICAgICAgICAgICAgZm9yIChsZXQgbmFtZXNwYWNlTmFtZSBpbiBTZXJpYWxpemVyLm5hbWVzcGFjZXMpIHtcbiAgICAgICAgICAgICAgICBsZXQgZm91bmQ6IEdlbmVyYWwgPSAoPEdlbmVyYWw+U2VyaWFsaXplci5uYW1lc3BhY2VzKVtuYW1lc3BhY2VOYW1lXVt0eXBlTmFtZV07XG4gICAgICAgICAgICAgICAgaWYgKGZvdW5kICYmIF9vYmplY3QgaW5zdGFuY2VvZiBmb3VuZClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5hbWVzcGFjZU5hbWUgKyBcIi5cIiArIHR5cGVOYW1lO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogUmV0dXJucyB0aGUgbmFtZXNwYWNlLW9iamVjdCBkZWZpbmVkIHdpdGhpbiB0aGUgZnVsbCBwYXRoLCBpZiByZWdpc3RlcmVkXG4gICAgICAgICAqIEBwYXJhbSBfcGF0aFxuICAgICAgICAgKi9cbiAgICAgICAgcHJpdmF0ZSBzdGF0aWMgZ2V0TmFtZXNwYWNlKF9wYXRoOiBzdHJpbmcpOiBPYmplY3Qge1xuICAgICAgICAgICAgbGV0IG5hbWVzcGFjZU5hbWU6IHN0cmluZyA9IF9wYXRoLnN1YnN0cigwLCBfcGF0aC5sYXN0SW5kZXhPZihcIi5cIikpO1xuICAgICAgICAgICAgcmV0dXJuIFNlcmlhbGl6ZXIubmFtZXNwYWNlc1tuYW1lc3BhY2VOYW1lXTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGaW5kcyB0aGUgbmFtZXNwYWNlLW9iamVjdCBpbiBwcm9wZXJ0aWVzIG9mIHRoZSBwYXJlbnQtb2JqZWN0IChlLmcuIHdpbmRvdyksIGlmIHByZXNlbnRcbiAgICAgICAgICogQHBhcmFtIF9uYW1lc3BhY2UgXG4gICAgICAgICAqIEBwYXJhbSBfcGFyZW50IFxuICAgICAgICAgKi9cbiAgICAgICAgcHJpdmF0ZSBzdGF0aWMgZmluZE5hbWVzcGFjZUluKF9uYW1lc3BhY2U6IE9iamVjdCwgX3BhcmVudDogT2JqZWN0KTogc3RyaW5nIHtcbiAgICAgICAgICAgIGZvciAobGV0IHByb3AgaW4gX3BhcmVudClcbiAgICAgICAgICAgICAgICBpZiAoKDxHZW5lcmFsPl9wYXJlbnQpW3Byb3BdID09IF9uYW1lc3BhY2UpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwcm9wO1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICB9XG59IiwibmFtZXNwYWNlIEZ1ZGdlQ29yZSB7XG4gICAgLyoqXG4gICAgICogSW50ZXJmYWNlIGRlc2NyaWJpbmcgdGhlIGRhdGF0eXBlcyBvZiB0aGUgYXR0cmlidXRlcyBhIG11dGF0b3IgYXMgc3RyaW5ncyBcbiAgICAgKi9cbiAgICBleHBvcnQgaW50ZXJmYWNlIE11dGF0b3JBdHRyaWJ1dGVUeXBlcyB7XG4gICAgICAgIFthdHRyaWJ1dGU6IHN0cmluZ106IHN0cmluZyB8IE9iamVjdDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogSW50ZXJmYWNlIGRlc2NyaWJpbmcgYSBtdXRhdG9yLCB3aGljaCBpcyBhbiBhc3NvY2lhdGl2ZSBhcnJheSB3aXRoIG5hbWVzIG9mIGF0dHJpYnV0ZXMgYW5kIHRoZWlyIGNvcnJlc3BvbmRpbmcgdmFsdWVzXG4gICAgICovXG4gICAgZXhwb3J0IGludGVyZmFjZSBNdXRhdG9yIHtcbiAgICAgICAgW2F0dHJpYnV0ZTogc3RyaW5nXTogT2JqZWN0O1xuICAgIH1cblxuICAgIC8qXG4gICAgICogSW50ZXJmYWNlcyBkZWRpY2F0ZWQgZm9yIGVhY2ggcHVycG9zZS4gRXh0cmEgYXR0cmlidXRlIG5lY2Vzc2FyeSBmb3IgY29tcGlsZXRpbWUgdHlwZSBjaGVja2luZywgbm90IGV4aXN0ZW50IGF0IHJ1bnRpbWVcbiAgICAgKi9cbiAgICBleHBvcnQgaW50ZXJmYWNlIE11dGF0b3JGb3JBbmltYXRpb24gZXh0ZW5kcyBNdXRhdG9yIHsgcmVhZG9ubHkgZm9yQW5pbWF0aW9uOiBudWxsOyB9XG4gICAgZXhwb3J0IGludGVyZmFjZSBNdXRhdG9yRm9yVXNlckludGVyZmFjZSBleHRlbmRzIE11dGF0b3IgeyByZWFkb25seSBmb3JVc2VySW50ZXJmYWNlOiBudWxsOyB9XG5cbiAgICAvKipcbiAgICAgKiBCYXNlIGNsYXNzIGZvciBhbGwgdHlwZXMgYmVpbmcgbXV0YWJsZSB1c2luZyBbW011dGF0b3JdXS1vYmplY3RzLCB0aHVzIHByb3ZpZGluZyBhbmQgdXNpbmcgaW50ZXJmYWNlcyBjcmVhdGVkIGF0IHJ1bnRpbWUuICBcbiAgICAgKiBNdXRhYmxlcyBwcm92aWRlIGEgW1tNdXRhdG9yXV0gdGhhdCBpcyBidWlsZCBieSBjb2xsZWN0aW5nIGFsbCBvYmplY3QtcHJvcGVydGllcyB0aGF0IGFyZSBlaXRoZXIgb2YgYSBwcmltaXRpdmUgdHlwZSBvciBhZ2FpbiBNdXRhYmxlLlxuICAgICAqIFN1YmNsYXNzZXMgY2FuIGVpdGhlciByZWR1Y2UgdGhlIHN0YW5kYXJkIFtbTXV0YXRvcl1dIGJ1aWx0IGJ5IHRoaXMgYmFzZSBjbGFzcyBieSBkZWxldGluZyBwcm9wZXJ0aWVzIG9yIGltcGxlbWVudCBhbiBpbmRpdmlkdWFsIGdldE11dGF0b3ItbWV0aG9kLlxuICAgICAqIFRoZSBwcm92aWRlZCBwcm9wZXJ0aWVzIG9mIHRoZSBbW011dGF0b3JdXSBtdXN0IG1hdGNoIHB1YmxpYyBwcm9wZXJ0aWVzIG9yIGdldHRlcnMvc2V0dGVycyBvZiB0aGUgb2JqZWN0LlxuICAgICAqIE90aGVyd2lzZSwgdGhleSB3aWxsIGJlIGlnbm9yZWQgaWYgbm90IGhhbmRsZWQgYnkgYW4gb3ZlcnJpZGUgb2YgdGhlIG11dGF0ZS1tZXRob2QgaW4gdGhlIHN1YmNsYXNzIGFuZCB0aHJvdyBlcnJvcnMgaW4gYW4gYXV0b21hdGljYWxseSBnZW5lcmF0ZWQgdXNlci1pbnRlcmZhY2UgZm9yIHRoZSBvYmplY3QuXG4gICAgICovXG4gICAgZXhwb3J0IGFic3RyYWN0IGNsYXNzIE11dGFibGUgZXh0ZW5kcyBFdmVudFRhcmdldCB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZXRyaWV2ZXMgdGhlIHR5cGUgb2YgdGhpcyBtdXRhYmxlIHN1YmNsYXNzIGFzIHRoZSBuYW1lIG9mIHRoZSBydW50aW1lIGNsYXNzXG4gICAgICAgICAqIEByZXR1cm5zIFRoZSB0eXBlIG9mIHRoZSBtdXRhYmxlXG4gICAgICAgICAqL1xuICAgICAgICBwdWJsaWMgZ2V0IHR5cGUoKTogc3RyaW5nIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLm5hbWU7XG4gICAgICAgIH1cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENvbGxlY3QgYXBwbGljYWJsZSBhdHRyaWJ1dGVzIG9mIHRoZSBpbnN0YW5jZSBhbmQgY29waWVzIG9mIHRoZWlyIHZhbHVlcyBpbiBhIE11dGF0b3Itb2JqZWN0XG4gICAgICAgICAqL1xuICAgICAgICBwdWJsaWMgZ2V0TXV0YXRvcigpOiBNdXRhdG9yIHtcbiAgICAgICAgICAgIGxldCBtdXRhdG9yOiBNdXRhdG9yID0ge307XG5cbiAgICAgICAgICAgIC8vIGNvbGxlY3QgcHJpbWl0aXZlIGFuZCBtdXRhYmxlIGF0dHJpYnV0ZXNcbiAgICAgICAgICAgIGZvciAobGV0IGF0dHJpYnV0ZSBpbiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgbGV0IHZhbHVlOiBPYmplY3QgPSB0aGlzW2F0dHJpYnV0ZV07XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgRnVuY3Rpb24pXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIE9iamVjdCAmJiAhKHZhbHVlIGluc3RhbmNlb2YgTXV0YWJsZSkpXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIG11dGF0b3JbYXR0cmlidXRlXSA9IHRoaXNbYXR0cmlidXRlXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gbXV0YXRvciBjYW4gYmUgcmVkdWNlZCBidXQgbm90IGV4dGVuZGVkIVxuICAgICAgICAgICAgT2JqZWN0LnByZXZlbnRFeHRlbnNpb25zKG11dGF0b3IpO1xuICAgICAgICAgICAgLy8gZGVsZXRlIHVud2FudGVkIGF0dHJpYnV0ZXNcbiAgICAgICAgICAgIHRoaXMucmVkdWNlTXV0YXRvcihtdXRhdG9yKTtcblxuICAgICAgICAgICAgLy8gcmVwbGFjZSByZWZlcmVuY2VzIHRvIG11dGFibGUgb2JqZWN0cyB3aXRoIHJlZmVyZW5jZXMgdG8gY29waWVzXG4gICAgICAgICAgICBmb3IgKGxldCBhdHRyaWJ1dGUgaW4gbXV0YXRvcikge1xuICAgICAgICAgICAgICAgIGxldCB2YWx1ZTogT2JqZWN0ID0gbXV0YXRvclthdHRyaWJ1dGVdO1xuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIE11dGFibGUpXG4gICAgICAgICAgICAgICAgICAgIG11dGF0b3JbYXR0cmlidXRlXSA9IHZhbHVlLmdldE11dGF0b3IoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIG11dGF0b3I7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogQ29sbGVjdCB0aGUgYXR0cmlidXRlcyBvZiB0aGUgaW5zdGFuY2UgYW5kIHRoZWlyIHZhbHVlcyBhcHBsaWNhYmxlIGZvciBhbmltYXRpb24uXG4gICAgICAgICAqIEJhc2ljIGZ1bmN0aW9uYWxpdHkgaXMgaWRlbnRpY2FsIHRvIFtbZ2V0TXV0YXRvcl1dLCByZXR1cm5lZCBtdXRhdG9yIHNob3VsZCB0aGVuIGJlIHJlZHVjZWQgYnkgdGhlIHN1YmNsYXNzZWQgaW5zdGFuY2VcbiAgICAgICAgICovXG4gICAgICAgIHB1YmxpYyBnZXRNdXRhdG9yRm9yQW5pbWF0aW9uKCk6IE11dGF0b3JGb3JBbmltYXRpb24ge1xuICAgICAgICAgICAgcmV0dXJuIDxNdXRhdG9yRm9yQW5pbWF0aW9uPnRoaXMuZ2V0TXV0YXRvcigpO1xuICAgICAgICB9XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDb2xsZWN0IHRoZSBhdHRyaWJ1dGVzIG9mIHRoZSBpbnN0YW5jZSBhbmQgdGhlaXIgdmFsdWVzIGFwcGxpY2FibGUgZm9yIHRoZSB1c2VyIGludGVyZmFjZS5cbiAgICAgICAgICogQmFzaWMgZnVuY3Rpb25hbGl0eSBpcyBpZGVudGljYWwgdG8gW1tnZXRNdXRhdG9yXV0sIHJldHVybmVkIG11dGF0b3Igc2hvdWxkIHRoZW4gYmUgcmVkdWNlZCBieSB0aGUgc3ViY2xhc3NlZCBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgcHVibGljIGdldE11dGF0b3JGb3JVc2VySW50ZXJmYWNlKCk6IE11dGF0b3JGb3JVc2VySW50ZXJmYWNlIHtcbiAgICAgICAgICAgIHJldHVybiA8TXV0YXRvckZvclVzZXJJbnRlcmZhY2U+dGhpcy5nZXRNdXRhdG9yKCk7XG4gICAgICAgIH1cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJldHVybnMgYW4gYXNzb2NpYXRpdmUgYXJyYXkgd2l0aCB0aGUgc2FtZSBhdHRyaWJ1dGVzIGFzIHRoZSBnaXZlbiBtdXRhdG9yLCBidXQgd2l0aCB0aGUgY29ycmVzcG9uZGluZyB0eXBlcyBhcyBzdHJpbmctdmFsdWVzXG4gICAgICAgICAqIERvZXMgbm90IHJlY3Vyc2UgaW50byBvYmplY3RzIVxuICAgICAgICAgKiBAcGFyYW0gX211dGF0b3IgXG4gICAgICAgICAqL1xuICAgICAgICBwdWJsaWMgZ2V0TXV0YXRvckF0dHJpYnV0ZVR5cGVzKF9tdXRhdG9yOiBNdXRhdG9yKTogTXV0YXRvckF0dHJpYnV0ZVR5cGVzIHtcbiAgICAgICAgICAgIGxldCB0eXBlczogTXV0YXRvckF0dHJpYnV0ZVR5cGVzID0ge307XG4gICAgICAgICAgICBmb3IgKGxldCBhdHRyaWJ1dGUgaW4gX211dGF0b3IpIHtcbiAgICAgICAgICAgICAgICBsZXQgdHlwZTogc3RyaW5nID0gbnVsbDtcbiAgICAgICAgICAgICAgICBsZXQgdmFsdWU6IG51bWJlciB8IGJvb2xlYW4gfCBzdHJpbmcgfCBvYmplY3QgPSBfbXV0YXRvclthdHRyaWJ1dGVdO1xuICAgICAgICAgICAgICAgIGlmIChfbXV0YXRvclthdHRyaWJ1dGVdICE9IHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiAodmFsdWUpID09IFwib2JqZWN0XCIpXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlID0gKDxHZW5lcmFsPnRoaXMpW2F0dHJpYnV0ZV0uY29uc3RydWN0b3IubmFtZTtcbiAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZSA9IF9tdXRhdG9yW2F0dHJpYnV0ZV0uY29uc3RydWN0b3IubmFtZTtcbiAgICAgICAgICAgICAgICB0eXBlc1thdHRyaWJ1dGVdID0gdHlwZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0eXBlcztcbiAgICAgICAgfVxuICAgICAgICAvKipcbiAgICAgICAgICogVXBkYXRlcyB0aGUgdmFsdWVzIG9mIHRoZSBnaXZlbiBtdXRhdG9yIGFjY29yZGluZyB0byB0aGUgY3VycmVudCBzdGF0ZSBvZiB0aGUgaW5zdGFuY2VcbiAgICAgICAgICogQHBhcmFtIF9tdXRhdG9yIFxuICAgICAgICAgKi9cbiAgICAgICAgcHVibGljIHVwZGF0ZU11dGF0b3IoX211dGF0b3I6IE11dGF0b3IpOiB2b2lkIHtcbiAgICAgICAgICAgIGZvciAobGV0IGF0dHJpYnV0ZSBpbiBfbXV0YXRvcikge1xuICAgICAgICAgICAgICAgIGxldCB2YWx1ZTogT2JqZWN0ID0gX211dGF0b3JbYXR0cmlidXRlXTtcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBNdXRhYmxlKVxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLmdldE11dGF0b3IoKTtcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIF9tdXRhdG9yW2F0dHJpYnV0ZV0gPSAoPEdlbmVyYWw+dGhpcylbYXR0cmlidXRlXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvKipcbiAgICAgICAgICogVXBkYXRlcyB0aGUgYXR0cmlidXRlIHZhbHVlcyBvZiB0aGUgaW5zdGFuY2UgYWNjb3JkaW5nIHRvIHRoZSBzdGF0ZSBvZiB0aGUgbXV0YXRvci4gTXVzdCBiZSBwcm90ZWN0ZWQuLi4hXG4gICAgICAgICAqIEBwYXJhbSBfbXV0YXRvclxuICAgICAgICAgKi9cbiAgICAgICAgcHVibGljIG11dGF0ZShfbXV0YXRvcjogTXV0YXRvcik6IHZvaWQge1xuICAgICAgICAgICAgLy8gVE9ETzogZG9uJ3QgYXNzaWduIHVua25vd24gcHJvcGVydGllc1xuICAgICAgICAgICAgZm9yIChsZXQgYXR0cmlidXRlIGluIF9tdXRhdG9yKSB7XG4gICAgICAgICAgICAgICAgbGV0IHZhbHVlOiBNdXRhdG9yID0gPE11dGF0b3I+X211dGF0b3JbYXR0cmlidXRlXTtcbiAgICAgICAgICAgICAgICBsZXQgbXV0YW50OiBPYmplY3QgPSAoPEdlbmVyYWw+dGhpcylbYXR0cmlidXRlXTtcbiAgICAgICAgICAgICAgICBpZiAobXV0YW50IGluc3RhbmNlb2YgTXV0YWJsZSlcbiAgICAgICAgICAgICAgICAgICAgbXV0YW50Lm11dGF0ZSh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAoPEdlbmVyYWw+dGhpcylbYXR0cmlidXRlXSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudChFVkVOVC5NVVRBVEUpKTtcbiAgICAgICAgfVxuICAgICAgICAvKipcbiAgICAgICAgICogUmVkdWNlcyB0aGUgYXR0cmlidXRlcyBvZiB0aGUgZ2VuZXJhbCBtdXRhdG9yIGFjY29yZGluZyB0byBkZXNpcmVkIG9wdGlvbnMgZm9yIG11dGF0aW9uLiBUbyBiZSBpbXBsZW1lbnRlZCBpbiBzdWJjbGFzc2VzXG4gICAgICAgICAqIEBwYXJhbSBfbXV0YXRvciBcbiAgICAgICAgICovXG4gICAgICAgIHByb3RlY3RlZCBhYnN0cmFjdCByZWR1Y2VNdXRhdG9yKF9tdXRhdG9yOiBNdXRhdG9yKTogdm9pZDtcbiAgICB9XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vVHJhbnNmZXIvU2VyaWFsaXplci50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi9UcmFuc2Zlci9NdXRhYmxlLnRzXCIvPlxuXG5uYW1lc3BhY2UgRnVkZ2VDb3JlIHtcbiAgLyoqXG4gICAqIEhvbGRzIGluZm9ybWF0aW9uIGFib3V0IHRoZSBBbmltYXRpb25TdHJ1Y3R1cmUgdGhhdCB0aGUgQW5pbWF0aW9uIHVzZXMgdG8gbWFwIHRoZSBTZXF1ZW5jZXMgdG8gdGhlIEF0dHJpYnV0ZXMuXG4gICAqIEJ1aWx0IG91dCBvZiBhIFtbTm9kZV1dJ3Mgc2VyaWFsc2F0aW9uLCBpdCBzd2FwcyB0aGUgdmFsdWVzIHdpdGggW1tBbmltYXRpb25TZXF1ZW5jZV1dcy5cbiAgICovXG4gIGV4cG9ydCBpbnRlcmZhY2UgQW5pbWF0aW9uU3RydWN0dXJlIHtcbiAgICBbYXR0cmlidXRlOiBzdHJpbmddOiBTZXJpYWxpemF0aW9uIHwgQW5pbWF0aW9uU2VxdWVuY2U7XG4gIH1cblxuICAvKipcbiAgKiBBbiBhc3NvY2lhdGl2ZSBhcnJheSBtYXBwaW5nIG5hbWVzIG9mIGxhYmxlcyB0byB0aW1lc3RhbXBzLlxuICAqIExhYmVscyBuZWVkIHRvIGJlIHVuaXF1ZSBwZXIgQW5pbWF0aW9uLlxuICAqIEBhdXRob3IgTHVrYXMgU2NoZXVlcmxlLCBIRlUsIDIwMTlcbiAgKi9cbiAgZXhwb3J0IGludGVyZmFjZSBBbmltYXRpb25MYWJlbCB7XG4gICAgW25hbWU6IHN0cmluZ106IG51bWJlcjtcbiAgfVxuXG4gIC8qKlxuICAqIEhvbGRzIGluZm9ybWF0aW9uIGFib3V0IEFuaW1hdGlvbiBFdmVudCBUcmlnZ2Vyc1xuICAqIEBhdXRob3IgTHVrYXMgU2NoZXVlcmxlLCBIRlUsIDIwMTlcbiAgKi9cbiAgZXhwb3J0IGludGVyZmFjZSBBbmltYXRpb25FdmVudFRyaWdnZXIge1xuICAgIFtuYW1lOiBzdHJpbmddOiBudW1iZXI7XG4gIH1cblxuICAvKipcbiAgICogSW50ZXJuYWxseSB1c2VkIHRvIGRpZmZlcmVudGlhdGUgYmV0d2VlbiB0aGUgdmFyaW91cyBnZW5lcmF0ZWQgc3RydWN0dXJlcyBhbmQgZXZlbnRzLlxuICAgKiBAYXV0aG9yIEx1a2FzIFNjaGV1ZXJsZSwgSEZVLCAyMDE5XG4gICAqL1xuICBlbnVtIEFOSU1BVElPTl9TVFJVQ1RVUkVfVFlQRSB7XG4gICAgLyoqRGVmYXVsdDogZm9yd2FyZCwgY29udGlub3VzICovXG4gICAgTk9STUFMLFxuICAgIC8qKmJhY2t3YXJkLCBjb250aW5vdXMgKi9cbiAgICBSRVZFUlNFLFxuICAgIC8qKmZvcndhcmQsIHJhc3RlcmVkICovXG4gICAgUkFTVEVSRUQsXG4gICAgLyoqYmFja3dhcmQsIHJhc3RlcmVkICovXG4gICAgUkFTVEVSRURSRVZFUlNFXG4gIH1cblxuICAvKipcbiAgICogQW5pbWF0aW9uIENsYXNzIHRvIGhvbGQgYWxsIHJlcXVpcmVkIE9iamVjdHMgdGhhdCBhcmUgcGFydCBvZiBhbiBBbmltYXRpb24uXG4gICAqIEFsc28gaG9sZHMgZnVuY3Rpb25zIHRvIHBsYXkgc2FpZCBBbmltYXRpb24uXG4gICAqIENhbiBiZSBhZGRlZCB0byBhIE5vZGUgYW5kIHBsYXllZCB0aHJvdWdoIFtbQ29tcG9uZW50QW5pbWF0b3JdXS5cbiAgICogQGF1dGhvciBMdWthcyBTY2hldWVybGUsIEhGVSwgMjAxOVxuICAgKi9cbiAgZXhwb3J0IGNsYXNzIEFuaW1hdGlvbiBleHRlbmRzIE11dGFibGUgaW1wbGVtZW50cyBTZXJpYWxpemFibGVSZXNvdXJjZSB7XG4gICAgaWRSZXNvdXJjZTogc3RyaW5nO1xuICAgIG5hbWU6IHN0cmluZztcbiAgICB0b3RhbFRpbWU6IG51bWJlciA9IDA7XG4gICAgbGFiZWxzOiBBbmltYXRpb25MYWJlbCA9IHt9O1xuICAgIHN0ZXBzUGVyU2Vjb25kOiBudW1iZXIgPSAxMDtcbiAgICBhbmltYXRpb25TdHJ1Y3R1cmU6IEFuaW1hdGlvblN0cnVjdHVyZTtcbiAgICBldmVudHM6IEFuaW1hdGlvbkV2ZW50VHJpZ2dlciA9IHt9O1xuICAgIHByaXZhdGUgZnJhbWVzUGVyU2Vjb25kOiBudW1iZXIgPSA2MDtcblxuICAgIC8vIHByb2Nlc3NlZCBldmVudGxpc3QgYW5kIGFuaW1hdGlvbiBzdHJ1Y3V0cmVzIGZvciBwbGF5YmFjay5cbiAgICBwcml2YXRlIGV2ZW50c1Byb2Nlc3NlZDogTWFwPEFOSU1BVElPTl9TVFJVQ1RVUkVfVFlQRSwgQW5pbWF0aW9uRXZlbnRUcmlnZ2VyPiA9IG5ldyBNYXA8QU5JTUFUSU9OX1NUUlVDVFVSRV9UWVBFLCBBbmltYXRpb25FdmVudFRyaWdnZXI+KCk7XG4gICAgcHJpdmF0ZSBhbmltYXRpb25TdHJ1Y3R1cmVzUHJvY2Vzc2VkOiBNYXA8QU5JTUFUSU9OX1NUUlVDVFVSRV9UWVBFLCBBbmltYXRpb25TdHJ1Y3R1cmU+ID0gbmV3IE1hcDxBTklNQVRJT05fU1RSVUNUVVJFX1RZUEUsIEFuaW1hdGlvblN0cnVjdHVyZT4oKTtcblxuICAgIGNvbnN0cnVjdG9yKF9uYW1lOiBzdHJpbmcsIF9hbmltU3RydWN0dXJlOiBBbmltYXRpb25TdHJ1Y3R1cmUgPSB7fSwgX2ZwczogbnVtYmVyID0gNjApIHtcbiAgICAgIHN1cGVyKCk7XG4gICAgICB0aGlzLm5hbWUgPSBfbmFtZTtcbiAgICAgIHRoaXMuYW5pbWF0aW9uU3RydWN0dXJlID0gX2FuaW1TdHJ1Y3R1cmU7XG4gICAgICB0aGlzLmFuaW1hdGlvblN0cnVjdHVyZXNQcm9jZXNzZWQuc2V0KEFOSU1BVElPTl9TVFJVQ1RVUkVfVFlQRS5OT1JNQUwsIF9hbmltU3RydWN0dXJlKTtcbiAgICAgIHRoaXMuZnJhbWVzUGVyU2Vjb25kID0gX2ZwcztcbiAgICAgIHRoaXMuY2FsY3VsYXRlVG90YWxUaW1lKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGVzIGEgbmV3IFwiTXV0YXRvclwiIHdpdGggdGhlIGluZm9ybWF0aW9uIHRvIGFwcGx5IHRvIHRoZSBbW05vZGVdXSB0aGUgW1tDb21wb25lbnRBbmltYXRvcl1dIGlzIGF0dGFjaGVkIHRvIHdpdGggW1tOb2RlLmFwcGx5QW5pbWF0aW9uKCldXS5cbiAgICAgKiBAcGFyYW0gX3RpbWUgVGhlIHRpbWUgYXQgd2hpY2ggdGhlIGFuaW1hdGlvbiBjdXJyZW50bHkgaXMgYXRcbiAgICAgKiBAcGFyYW0gX2RpcmVjdGlvbiBUaGUgZGlyZWN0aW9uIGluIHdoaWNoIHRoZSBhbmltYXRpb24gaXMgc3VwcG9zZWQgdG8gYmUgcGxheWluZyBiYWNrLiA+MCA9PSBmb3J3YXJkLCAwID09IHN0b3AsIDwwID09IGJhY2t3YXJkc1xuICAgICAqIEBwYXJhbSBfcGxheWJhY2sgVGhlIHBsYXliYWNrbW9kZSB0aGUgYW5pbWF0aW9uIGlzIHN1cHBvc2VkIHRvIGJlIGNhbGN1bGF0ZWQgd2l0aC5cbiAgICAgKiBAcmV0dXJucyBhIFwiTXV0YXRvclwiIHRvIGFwcGx5LlxuICAgICAqL1xuICAgIGdldE11dGF0ZWQoX3RpbWU6IG51bWJlciwgX2RpcmVjdGlvbjogbnVtYmVyLCBfcGxheWJhY2s6IEFOSU1BVElPTl9QTEFZQkFDSyk6IE11dGF0b3IgeyAgICAgLy9UT0RPOiBmaW5kIGEgYmV0dGVyIG5hbWUgZm9yIHRoaXNcbiAgICAgIGxldCBtOiBNdXRhdG9yID0ge307XG4gICAgICBpZiAoX3BsYXliYWNrID09IEFOSU1BVElPTl9QTEFZQkFDSy5USU1FQkFTRURfQ09OVElOT1VTKSB7XG4gICAgICAgIGlmIChfZGlyZWN0aW9uID49IDApIHtcbiAgICAgICAgICBtID0gdGhpcy50cmF2ZXJzZVN0cnVjdHVyZUZvck11dGF0b3IodGhpcy5nZXRQcm9jZXNzZWRBbmltYXRpb25TdHJ1Y3R1cmUoQU5JTUFUSU9OX1NUUlVDVFVSRV9UWVBFLk5PUk1BTCksIF90aW1lKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBtID0gdGhpcy50cmF2ZXJzZVN0cnVjdHVyZUZvck11dGF0b3IodGhpcy5nZXRQcm9jZXNzZWRBbmltYXRpb25TdHJ1Y3R1cmUoQU5JTUFUSU9OX1NUUlVDVFVSRV9UWVBFLlJFVkVSU0UpLCBfdGltZSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChfZGlyZWN0aW9uID49IDApIHtcbiAgICAgICAgICBtID0gdGhpcy50cmF2ZXJzZVN0cnVjdHVyZUZvck11dGF0b3IodGhpcy5nZXRQcm9jZXNzZWRBbmltYXRpb25TdHJ1Y3R1cmUoQU5JTUFUSU9OX1NUUlVDVFVSRV9UWVBFLlJBU1RFUkVEKSwgX3RpbWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG0gPSB0aGlzLnRyYXZlcnNlU3RydWN0dXJlRm9yTXV0YXRvcih0aGlzLmdldFByb2Nlc3NlZEFuaW1hdGlvblN0cnVjdHVyZShBTklNQVRJT05fU1RSVUNUVVJFX1RZUEUuUkFTVEVSRURSRVZFUlNFKSwgX3RpbWUpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBtO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgYSBsaXN0IG9mIHRoZSBuYW1lcyBvZiB0aGUgZXZlbnRzIHRoZSBbW0NvbXBvbmVudEFuaW1hdG9yXV0gbmVlZHMgdG8gZmlyZSBiZXR3ZWVuIF9taW4gYW5kIF9tYXguIFxuICAgICAqIEBwYXJhbSBfbWluIFRoZSBtaW5pbXVtIHRpbWUgKGluY2x1c2l2ZSkgdG8gY2hlY2sgYmV0d2VlblxuICAgICAqIEBwYXJhbSBfbWF4IFRoZSBtYXhpbXVtIHRpbWUgKGV4Y2x1c2l2ZSkgdG8gY2hlY2sgYmV0d2VlblxuICAgICAqIEBwYXJhbSBfcGxheWJhY2sgVGhlIHBsYXliYWNrIG1vZGUgdG8gY2hlY2sgaW4uIEhhcyBhbiBlZmZlY3Qgb24gd2hlbiB0aGUgRXZlbnRzIGFyZSBmaXJlZC4gXG4gICAgICogQHBhcmFtIF9kaXJlY3Rpb24gVGhlIGRpcmVjdGlvbiB0aGUgYW5pbWF0aW9uIGlzIHN1cHBvc2VkIHRvIHJ1biBpbi4gPjAgPT0gZm9yd2FyZCwgMCA9PSBzdG9wLCA8MCA9PSBiYWNrd2FyZHNcbiAgICAgKiBAcmV0dXJucyBhIGxpc3Qgb2Ygc3RyaW5ncyB3aXRoIHRoZSBuYW1lcyBvZiB0aGUgY3VzdG9tIGV2ZW50cyB0byBmaXJlLlxuICAgICAqL1xuICAgIGdldEV2ZW50c1RvRmlyZShfbWluOiBudW1iZXIsIF9tYXg6IG51bWJlciwgX3BsYXliYWNrOiBBTklNQVRJT05fUExBWUJBQ0ssIF9kaXJlY3Rpb246IG51bWJlcik6IHN0cmluZ1tdIHtcbiAgICAgIGxldCBldmVudExpc3Q6IHN0cmluZ1tdID0gW107XG4gICAgICBsZXQgbWluU2VjdGlvbjogbnVtYmVyID0gTWF0aC5mbG9vcihfbWluIC8gdGhpcy50b3RhbFRpbWUpO1xuICAgICAgbGV0IG1heFNlY3Rpb246IG51bWJlciA9IE1hdGguZmxvb3IoX21heCAvIHRoaXMudG90YWxUaW1lKTtcbiAgICAgIF9taW4gPSBfbWluICUgdGhpcy50b3RhbFRpbWU7XG4gICAgICBfbWF4ID0gX21heCAlIHRoaXMudG90YWxUaW1lO1xuXG4gICAgICB3aGlsZSAobWluU2VjdGlvbiA8PSBtYXhTZWN0aW9uKSB7XG4gICAgICAgIGxldCBldmVudFRyaWdnZXJzOiBBbmltYXRpb25FdmVudFRyaWdnZXIgPSB0aGlzLmdldENvcnJlY3RFdmVudExpc3QoX2RpcmVjdGlvbiwgX3BsYXliYWNrKTtcbiAgICAgICAgaWYgKG1pblNlY3Rpb24gPT0gbWF4U2VjdGlvbikge1xuICAgICAgICAgIGV2ZW50TGlzdCA9IGV2ZW50TGlzdC5jb25jYXQodGhpcy5jaGVja0V2ZW50c0JldHdlZW4oZXZlbnRUcmlnZ2VycywgX21pbiwgX21heCkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGV2ZW50TGlzdCA9IGV2ZW50TGlzdC5jb25jYXQodGhpcy5jaGVja0V2ZW50c0JldHdlZW4oZXZlbnRUcmlnZ2VycywgX21pbiwgdGhpcy50b3RhbFRpbWUpKTtcbiAgICAgICAgICBfbWluID0gMDtcbiAgICAgICAgfVxuICAgICAgICBtaW5TZWN0aW9uKys7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBldmVudExpc3Q7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQWRkcyBhbiBFdmVudCB0byB0aGUgTGlzdCBvZiBldmVudHMuXG4gICAgICogQHBhcmFtIF9uYW1lIFRoZSBuYW1lIG9mIHRoZSBldmVudCAobmVlZHMgdG8gYmUgdW5pcXVlIHBlciBBbmltYXRpb24pLlxuICAgICAqIEBwYXJhbSBfdGltZSBUaGUgdGltZXN0YW1wIG9mIHRoZSBldmVudCAoaW4gbWlsbGlzZWNvbmRzKS5cbiAgICAgKi9cbiAgICBzZXRFdmVudChfbmFtZTogc3RyaW5nLCBfdGltZTogbnVtYmVyKTogdm9pZCB7XG4gICAgICB0aGlzLmV2ZW50c1tfbmFtZV0gPSBfdGltZTtcbiAgICAgIHRoaXMuZXZlbnRzUHJvY2Vzc2VkLmNsZWFyKCk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgdGhlIGV2ZW50IHdpdGggdGhlIGdpdmVuIG5hbWUgZnJvbSB0aGUgbGlzdCBvZiBldmVudHMuXG4gICAgICogQHBhcmFtIF9uYW1lIG5hbWUgb2YgdGhlIGV2ZW50IHRvIHJlbW92ZS5cbiAgICAgKi9cbiAgICByZW1vdmVFdmVudChfbmFtZTogc3RyaW5nKTogdm9pZCB7XG4gICAgICBkZWxldGUgdGhpcy5ldmVudHNbX25hbWVdO1xuICAgICAgdGhpcy5ldmVudHNQcm9jZXNzZWQuY2xlYXIoKTtcbiAgICB9XG5cbiAgICBnZXQgZ2V0TGFiZWxzKCk6IEVudW1lcmF0b3Ige1xuICAgICAgLy9UT0RPOiB0aGlzIGFjdHVhbGx5IG5lZWRzIHRlc3RpbmdcbiAgICAgIGxldCBlbjogRW51bWVyYXRvciA9IG5ldyBFbnVtZXJhdG9yKHRoaXMubGFiZWxzKTtcbiAgICAgIHJldHVybiBlbjtcbiAgICB9XG5cbiAgICBnZXQgZnBzKCk6IG51bWJlciB7XG4gICAgICByZXR1cm4gdGhpcy5mcmFtZXNQZXJTZWNvbmQ7XG4gICAgfVxuXG4gICAgc2V0IGZwcyhfZnBzOiBudW1iZXIpIHtcbiAgICAgIHRoaXMuZnJhbWVzUGVyU2Vjb25kID0gX2ZwcztcbiAgICAgIHRoaXMuZXZlbnRzUHJvY2Vzc2VkLmNsZWFyKCk7XG4gICAgICB0aGlzLmFuaW1hdGlvblN0cnVjdHVyZXNQcm9jZXNzZWQuY2xlYXIoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAoUmUtKUNhbGN1bGF0ZSB0aGUgdG90YWwgdGltZSBvZiB0aGUgQW5pbWF0aW9uLiBDYWxjdWxhdGlvbi1oZWF2eSwgdXNlIG9ubHkgaWYgYWN0dWFsbHkgbmVlZGVkLlxuICAgICAqL1xuICAgIGNhbGN1bGF0ZVRvdGFsVGltZSgpOiB2b2lkIHtcbiAgICAgIHRoaXMudG90YWxUaW1lID0gMDtcbiAgICAgIHRoaXMudHJhdmVyc2VTdHJ1Y3R1cmVGb3JUaW1lKHRoaXMuYW5pbWF0aW9uU3RydWN0dXJlKTtcbiAgICB9XG5cbiAgICAvLyNyZWdpb24gdHJhbnNmZXJcbiAgICBzZXJpYWxpemUoKTogU2VyaWFsaXphdGlvbiB7XG4gICAgICBsZXQgczogU2VyaWFsaXphdGlvbiA9IHtcbiAgICAgICAgaWRSZXNvdXJjZTogdGhpcy5pZFJlc291cmNlLFxuICAgICAgICBuYW1lOiB0aGlzLm5hbWUsXG4gICAgICAgIGxhYmVsczoge30sXG4gICAgICAgIGV2ZW50czoge30sXG4gICAgICAgIGZwczogdGhpcy5mcmFtZXNQZXJTZWNvbmQsXG4gICAgICAgIHNwczogdGhpcy5zdGVwc1BlclNlY29uZFxuICAgICAgfTtcbiAgICAgIGZvciAobGV0IG5hbWUgaW4gdGhpcy5sYWJlbHMpIHtcbiAgICAgICAgcy5sYWJlbHNbbmFtZV0gPSB0aGlzLmxhYmVsc1tuYW1lXTtcbiAgICAgIH1cbiAgICAgIGZvciAobGV0IG5hbWUgaW4gdGhpcy5ldmVudHMpIHtcbiAgICAgICAgcy5ldmVudHNbbmFtZV0gPSB0aGlzLmV2ZW50c1tuYW1lXTtcbiAgICAgIH1cbiAgICAgIHMuYW5pbWF0aW9uU3RydWN0dXJlID0gdGhpcy50cmF2ZXJzZVN0cnVjdHVyZUZvclNlcmlhbGlzYXRpb24odGhpcy5hbmltYXRpb25TdHJ1Y3R1cmUpO1xuICAgICAgcmV0dXJuIHM7XG4gICAgfVxuICAgIGRlc2VyaWFsaXplKF9zZXJpYWxpemF0aW9uOiBTZXJpYWxpemF0aW9uKTogU2VyaWFsaXphYmxlIHtcbiAgICAgIHRoaXMuaWRSZXNvdXJjZSA9IF9zZXJpYWxpemF0aW9uLmlkUmVzb3VyY2U7XG4gICAgICB0aGlzLm5hbWUgPSBfc2VyaWFsaXphdGlvbi5uYW1lO1xuICAgICAgdGhpcy5mcmFtZXNQZXJTZWNvbmQgPSBfc2VyaWFsaXphdGlvbi5mcHM7XG4gICAgICB0aGlzLnN0ZXBzUGVyU2Vjb25kID0gX3NlcmlhbGl6YXRpb24uc3BzO1xuICAgICAgdGhpcy5sYWJlbHMgPSB7fTtcbiAgICAgIGZvciAobGV0IG5hbWUgaW4gX3NlcmlhbGl6YXRpb24ubGFiZWxzKSB7XG4gICAgICAgIHRoaXMubGFiZWxzW25hbWVdID0gX3NlcmlhbGl6YXRpb24ubGFiZWxzW25hbWVdO1xuICAgICAgfVxuICAgICAgdGhpcy5ldmVudHMgPSB7fTtcbiAgICAgIGZvciAobGV0IG5hbWUgaW4gX3NlcmlhbGl6YXRpb24uZXZlbnRzKSB7XG4gICAgICAgIHRoaXMuZXZlbnRzW25hbWVdID0gX3NlcmlhbGl6YXRpb24uZXZlbnRzW25hbWVdO1xuICAgICAgfVxuICAgICAgdGhpcy5ldmVudHNQcm9jZXNzZWQgPSBuZXcgTWFwPEFOSU1BVElPTl9TVFJVQ1RVUkVfVFlQRSwgQW5pbWF0aW9uRXZlbnRUcmlnZ2VyPigpO1xuXG4gICAgICB0aGlzLmFuaW1hdGlvblN0cnVjdHVyZSA9IHRoaXMudHJhdmVyc2VTdHJ1Y3R1cmVGb3JEZXNlcmlhbGlzYXRpb24oX3NlcmlhbGl6YXRpb24uYW5pbWF0aW9uU3RydWN0dXJlKTtcblxuICAgICAgdGhpcy5hbmltYXRpb25TdHJ1Y3R1cmVzUHJvY2Vzc2VkID0gbmV3IE1hcDxBTklNQVRJT05fU1RSVUNUVVJFX1RZUEUsIEFuaW1hdGlvblN0cnVjdHVyZT4oKTtcblxuICAgICAgdGhpcy5jYWxjdWxhdGVUb3RhbFRpbWUoKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBwdWJsaWMgZ2V0TXV0YXRvcigpOiBNdXRhdG9yIHtcbiAgICAgIHJldHVybiB0aGlzLnNlcmlhbGl6ZSgpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgcmVkdWNlTXV0YXRvcihfbXV0YXRvcjogTXV0YXRvcik6IHZvaWQge1xuICAgICAgZGVsZXRlIF9tdXRhdG9yLnRvdGFsVGltZTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogVHJhdmVyc2VzIGFuIEFuaW1hdGlvblN0cnVjdHVyZSBhbmQgcmV0dXJucyB0aGUgU2VyaWFsaXphdGlvbiBvZiBzYWlkIFN0cnVjdHVyZS5cbiAgICAgKiBAcGFyYW0gX3N0cnVjdHVyZSBUaGUgQW5pbWF0aW9uIFN0cnVjdHVyZSBhdCB0aGUgY3VycmVudCBsZXZlbCB0byB0cmFuc2Zvcm0gaW50byB0aGUgU2VyaWFsaXphdGlvbi5cbiAgICAgKiBAcmV0dXJucyB0aGUgZmlsbGVkIFNlcmlhbGl6YXRpb24uXG4gICAgICovXG4gICAgcHJpdmF0ZSB0cmF2ZXJzZVN0cnVjdHVyZUZvclNlcmlhbGlzYXRpb24oX3N0cnVjdHVyZTogQW5pbWF0aW9uU3RydWN0dXJlKTogU2VyaWFsaXphdGlvbiB7XG4gICAgICBsZXQgbmV3U2VyaWFsaXphdGlvbjogU2VyaWFsaXphdGlvbiA9IHt9O1xuICAgICAgZm9yIChsZXQgbiBpbiBfc3RydWN0dXJlKSB7XG4gICAgICAgIGlmIChfc3RydWN0dXJlW25dIGluc3RhbmNlb2YgQW5pbWF0aW9uU2VxdWVuY2UpIHtcbiAgICAgICAgICBuZXdTZXJpYWxpemF0aW9uW25dID0gX3N0cnVjdHVyZVtuXS5zZXJpYWxpemUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBuZXdTZXJpYWxpemF0aW9uW25dID0gdGhpcy50cmF2ZXJzZVN0cnVjdHVyZUZvclNlcmlhbGlzYXRpb24oPEFuaW1hdGlvblN0cnVjdHVyZT5fc3RydWN0dXJlW25dKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG5ld1NlcmlhbGl6YXRpb247XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRyYXZlcnNlcyBhIFNlcmlhbGl6YXRpb24gdG8gY3JlYXRlIGEgbmV3IEFuaW1hdGlvblN0cnVjdHVyZS5cbiAgICAgKiBAcGFyYW0gX3NlcmlhbGl6YXRpb24gVGhlIHNlcmlhbGl6YXRpb24gdG8gdHJhbnNmZXIgaW50byBhbiBBbmltYXRpb25TdHJ1Y3R1cmVcbiAgICAgKiBAcmV0dXJucyB0aGUgbmV3bHkgY3JlYXRlZCBBbmltYXRpb25TdHJ1Y3R1cmUuXG4gICAgICovXG4gICAgcHJpdmF0ZSB0cmF2ZXJzZVN0cnVjdHVyZUZvckRlc2VyaWFsaXNhdGlvbihfc2VyaWFsaXphdGlvbjogU2VyaWFsaXphdGlvbik6IEFuaW1hdGlvblN0cnVjdHVyZSB7XG4gICAgICBsZXQgbmV3U3RydWN0dXJlOiBBbmltYXRpb25TdHJ1Y3R1cmUgPSB7fTtcbiAgICAgIGZvciAobGV0IG4gaW4gX3NlcmlhbGl6YXRpb24pIHtcbiAgICAgICAgaWYgKF9zZXJpYWxpemF0aW9uW25dLmFuaW1hdGlvblNlcXVlbmNlKSB7XG4gICAgICAgICAgbGV0IGFuaW1TZXE6IEFuaW1hdGlvblNlcXVlbmNlID0gbmV3IEFuaW1hdGlvblNlcXVlbmNlKCk7XG4gICAgICAgICAgbmV3U3RydWN0dXJlW25dID0gYW5pbVNlcS5kZXNlcmlhbGl6ZShfc2VyaWFsaXphdGlvbltuXSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbmV3U3RydWN0dXJlW25dID0gdGhpcy50cmF2ZXJzZVN0cnVjdHVyZUZvckRlc2VyaWFsaXNhdGlvbihfc2VyaWFsaXphdGlvbltuXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBuZXdTdHJ1Y3R1cmU7XG4gICAgfVxuICAgIC8vI2VuZHJlZ2lvblxuXG4gICAgLyoqXG4gICAgICogRmluZHMgdGhlIGxpc3Qgb2YgZXZlbnRzIHRvIGJlIHVzZWQgd2l0aCB0aGVzZSBzZXR0aW5ncy5cbiAgICAgKiBAcGFyYW0gX2RpcmVjdGlvbiBUaGUgZGlyZWN0aW9uIHRoZSBhbmltYXRpb24gaXMgcGxheWluZyBpbi5cbiAgICAgKiBAcGFyYW0gX3BsYXliYWNrIFRoZSBwbGF5YmFja21vZGUgdGhlIGFuaW1hdGlvbiBpcyBwbGF5aW5nIGluLlxuICAgICAqIEByZXR1cm5zIFRoZSBjb3JyZWN0IEFuaW1hdGlvbkV2ZW50VHJpZ2dlciBPYmplY3QgdG8gdXNlXG4gICAgICovXG4gICAgcHJpdmF0ZSBnZXRDb3JyZWN0RXZlbnRMaXN0KF9kaXJlY3Rpb246IG51bWJlciwgX3BsYXliYWNrOiBBTklNQVRJT05fUExBWUJBQ0spOiBBbmltYXRpb25FdmVudFRyaWdnZXIge1xuICAgICAgaWYgKF9wbGF5YmFjayAhPSBBTklNQVRJT05fUExBWUJBQ0suRlJBTUVCQVNFRCkge1xuICAgICAgICBpZiAoX2RpcmVjdGlvbiA+PSAwKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0UHJvY2Vzc2VkRXZlbnRUcmlnZ2VyKEFOSU1BVElPTl9TVFJVQ1RVUkVfVFlQRS5OT1JNQUwpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiB0aGlzLmdldFByb2Nlc3NlZEV2ZW50VHJpZ2dlcihBTklNQVRJT05fU1RSVUNUVVJFX1RZUEUuUkVWRVJTRSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChfZGlyZWN0aW9uID49IDApIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5nZXRQcm9jZXNzZWRFdmVudFRyaWdnZXIoQU5JTUFUSU9OX1NUUlVDVFVSRV9UWVBFLlJBU1RFUkVEKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5nZXRQcm9jZXNzZWRFdmVudFRyaWdnZXIoQU5JTUFUSU9OX1NUUlVDVFVSRV9UWVBFLlJBU1RFUkVEUkVWRVJTRSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUcmF2ZXJzZXMgYW4gQW5pbWF0aW9uU3RydWN0dXJlIHRvIHR1cm4gaXQgaW50byB0aGUgXCJNdXRhdG9yXCIgdG8gcmV0dXJuIHRvIHRoZSBDb21wb25lbnQuXG4gICAgICogQHBhcmFtIF9zdHJ1Y3R1cmUgVGhlIHN0cmN1dHVyZSB0byB0cmF2ZXJzZVxuICAgICAqIEBwYXJhbSBfdGltZSB0aGUgcG9pbnQgaW4gdGltZSB0byB3cml0ZSB0aGUgYW5pbWF0aW9uIG51bWJlcnMgaW50by5cbiAgICAgKiBAcmV0dXJucyBUaGUgXCJNdXRhdG9yXCIgZmlsbGVkIHdpdGggdGhlIGNvcnJlY3QgdmFsdWVzIGF0IHRoZSBnaXZlbiB0aW1lLiBcbiAgICAgKi9cbiAgICBwcml2YXRlIHRyYXZlcnNlU3RydWN0dXJlRm9yTXV0YXRvcihfc3RydWN0dXJlOiBBbmltYXRpb25TdHJ1Y3R1cmUsIF90aW1lOiBudW1iZXIpOiBNdXRhdG9yIHtcbiAgICAgIGxldCBuZXdNdXRhdG9yOiBNdXRhdG9yID0ge307XG4gICAgICBmb3IgKGxldCBuIGluIF9zdHJ1Y3R1cmUpIHtcbiAgICAgICAgaWYgKF9zdHJ1Y3R1cmVbbl0gaW5zdGFuY2VvZiBBbmltYXRpb25TZXF1ZW5jZSkge1xuICAgICAgICAgIG5ld011dGF0b3Jbbl0gPSAoPEFuaW1hdGlvblNlcXVlbmNlPl9zdHJ1Y3R1cmVbbl0pLmV2YWx1YXRlKF90aW1lKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBuZXdNdXRhdG9yW25dID0gdGhpcy50cmF2ZXJzZVN0cnVjdHVyZUZvck11dGF0b3IoPEFuaW1hdGlvblN0cnVjdHVyZT5fc3RydWN0dXJlW25dLCBfdGltZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBuZXdNdXRhdG9yO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRyYXZlcnNlcyB0aGUgY3VycmVudCBBbmltYXRpb25TdHJjdXR1cmUgdG8gZmluZCB0aGUgdG90YWxUaW1lIG9mIHRoaXMgYW5pbWF0aW9uLlxuICAgICAqIEBwYXJhbSBfc3RydWN0dXJlIFRoZSBzdHJ1Y3R1cmUgdG8gdHJhdmVyc2VcbiAgICAgKi9cbiAgICBwcml2YXRlIHRyYXZlcnNlU3RydWN0dXJlRm9yVGltZShfc3RydWN0dXJlOiBBbmltYXRpb25TdHJ1Y3R1cmUpOiB2b2lkIHtcbiAgICAgIGZvciAobGV0IG4gaW4gX3N0cnVjdHVyZSkge1xuICAgICAgICBpZiAoX3N0cnVjdHVyZVtuXSBpbnN0YW5jZW9mIEFuaW1hdGlvblNlcXVlbmNlKSB7XG4gICAgICAgICAgbGV0IHNlcXVlbmNlOiBBbmltYXRpb25TZXF1ZW5jZSA9IDxBbmltYXRpb25TZXF1ZW5jZT5fc3RydWN0dXJlW25dO1xuICAgICAgICAgIGlmIChzZXF1ZW5jZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBsZXQgc2VxdWVuY2VUaW1lOiBudW1iZXIgPSBzZXF1ZW5jZS5nZXRLZXkoc2VxdWVuY2UubGVuZ3RoIC0gMSkuVGltZTtcbiAgICAgICAgICAgIHRoaXMudG90YWxUaW1lID0gc2VxdWVuY2VUaW1lID4gdGhpcy50b3RhbFRpbWUgPyBzZXF1ZW5jZVRpbWUgOiB0aGlzLnRvdGFsVGltZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy50cmF2ZXJzZVN0cnVjdHVyZUZvclRpbWUoPEFuaW1hdGlvblN0cnVjdHVyZT5fc3RydWN0dXJlW25dKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEVuc3VyZXMgdGhlIGV4aXN0YW5jZSBvZiB0aGUgcmVxdWVzdGVkIFtbQW5pbWF0aW9uU3RyY3V0dXJlXV0gYW5kIHJldHVybnMgaXQuXG4gICAgICogQHBhcmFtIF90eXBlIHRoZSB0eXBlIG9mIHRoZSBzdHJ1Y3R1cmUgdG8gZ2V0XG4gICAgICogQHJldHVybnMgdGhlIHJlcXVlc3RlZCBbW0FuaW1hdGlvblN0cnVjdHVyZV1dXG4gICAgICovXG4gICAgcHJpdmF0ZSBnZXRQcm9jZXNzZWRBbmltYXRpb25TdHJ1Y3R1cmUoX3R5cGU6IEFOSU1BVElPTl9TVFJVQ1RVUkVfVFlQRSk6IEFuaW1hdGlvblN0cnVjdHVyZSB7XG4gICAgICBpZiAoIXRoaXMuYW5pbWF0aW9uU3RydWN0dXJlc1Byb2Nlc3NlZC5oYXMoX3R5cGUpKSB7XG4gICAgICAgIHRoaXMuY2FsY3VsYXRlVG90YWxUaW1lKCk7XG4gICAgICAgIGxldCBhZTogQW5pbWF0aW9uU3RydWN0dXJlID0ge307XG4gICAgICAgIHN3aXRjaCAoX3R5cGUpIHtcbiAgICAgICAgICBjYXNlIEFOSU1BVElPTl9TVFJVQ1RVUkVfVFlQRS5OT1JNQUw6XG4gICAgICAgICAgICBhZSA9IHRoaXMuYW5pbWF0aW9uU3RydWN0dXJlO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSBBTklNQVRJT05fU1RSVUNUVVJFX1RZUEUuUkVWRVJTRTpcbiAgICAgICAgICAgIGFlID0gdGhpcy50cmF2ZXJzZVN0cnVjdHVyZUZvck5ld1N0cnVjdHVyZSh0aGlzLmFuaW1hdGlvblN0cnVjdHVyZSwgdGhpcy5jYWxjdWxhdGVSZXZlcnNlU2VxdWVuY2UuYmluZCh0aGlzKSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlIEFOSU1BVElPTl9TVFJVQ1RVUkVfVFlQRS5SQVNURVJFRDpcbiAgICAgICAgICAgIGFlID0gdGhpcy50cmF2ZXJzZVN0cnVjdHVyZUZvck5ld1N0cnVjdHVyZSh0aGlzLmFuaW1hdGlvblN0cnVjdHVyZSwgdGhpcy5jYWxjdWxhdGVSYXN0ZXJlZFNlcXVlbmNlLmJpbmQodGhpcykpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSBBTklNQVRJT05fU1RSVUNUVVJFX1RZUEUuUkFTVEVSRURSRVZFUlNFOlxuICAgICAgICAgICAgYWUgPSB0aGlzLnRyYXZlcnNlU3RydWN0dXJlRm9yTmV3U3RydWN0dXJlKHRoaXMuZ2V0UHJvY2Vzc2VkQW5pbWF0aW9uU3RydWN0dXJlKEFOSU1BVElPTl9TVFJVQ1RVUkVfVFlQRS5SRVZFUlNFKSwgdGhpcy5jYWxjdWxhdGVSYXN0ZXJlZFNlcXVlbmNlLmJpbmQodGhpcykpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiB7fTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmFuaW1hdGlvblN0cnVjdHVyZXNQcm9jZXNzZWQuc2V0KF90eXBlLCBhZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5hbmltYXRpb25TdHJ1Y3R1cmVzUHJvY2Vzc2VkLmdldChfdHlwZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRW5zdXJlcyB0aGUgZXhpc3RhbmNlIG9mIHRoZSByZXF1ZXN0ZWQgW1tBbmltYXRpb25FdmVudFRyaWdnZXJdXSBhbmQgcmV0dXJucyBpdC5cbiAgICAgKiBAcGFyYW0gX3R5cGUgVGhlIHR5cGUgb2YgQW5pbWF0aW9uRXZlbnRUcmlnZ2VyIHRvIGdldFxuICAgICAqIEByZXR1cm5zIHRoZSByZXF1ZXN0ZWQgW1tBbmltYXRpb25FdmVudFRyaWdnZXJdXVxuICAgICAqL1xuICAgIHByaXZhdGUgZ2V0UHJvY2Vzc2VkRXZlbnRUcmlnZ2VyKF90eXBlOiBBTklNQVRJT05fU1RSVUNUVVJFX1RZUEUpOiBBbmltYXRpb25FdmVudFRyaWdnZXIge1xuICAgICAgaWYgKCF0aGlzLmV2ZW50c1Byb2Nlc3NlZC5oYXMoX3R5cGUpKSB7XG4gICAgICAgIHRoaXMuY2FsY3VsYXRlVG90YWxUaW1lKCk7XG4gICAgICAgIGxldCBldjogQW5pbWF0aW9uRXZlbnRUcmlnZ2VyID0ge307XG4gICAgICAgIHN3aXRjaCAoX3R5cGUpIHtcbiAgICAgICAgICBjYXNlIEFOSU1BVElPTl9TVFJVQ1RVUkVfVFlQRS5OT1JNQUw6XG4gICAgICAgICAgICBldiA9IHRoaXMuZXZlbnRzO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSBBTklNQVRJT05fU1RSVUNUVVJFX1RZUEUuUkVWRVJTRTpcbiAgICAgICAgICAgIGV2ID0gdGhpcy5jYWxjdWxhdGVSZXZlcnNlRXZlbnRUcmlnZ2Vycyh0aGlzLmV2ZW50cyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlIEFOSU1BVElPTl9TVFJVQ1RVUkVfVFlQRS5SQVNURVJFRDpcbiAgICAgICAgICAgIGV2ID0gdGhpcy5jYWxjdWxhdGVSYXN0ZXJlZEV2ZW50VHJpZ2dlcnModGhpcy5ldmVudHMpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSBBTklNQVRJT05fU1RSVUNUVVJFX1RZUEUuUkFTVEVSRURSRVZFUlNFOlxuICAgICAgICAgICAgZXYgPSB0aGlzLmNhbGN1bGF0ZVJhc3RlcmVkRXZlbnRUcmlnZ2Vycyh0aGlzLmdldFByb2Nlc3NlZEV2ZW50VHJpZ2dlcihBTklNQVRJT05fU1RSVUNUVVJFX1RZUEUuUkVWRVJTRSkpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiB7fTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmV2ZW50c1Byb2Nlc3NlZC5zZXQoX3R5cGUsIGV2KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLmV2ZW50c1Byb2Nlc3NlZC5nZXQoX3R5cGUpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRyYXZlcnNlcyBhbiBleGlzdGluZyBzdHJ1Y3R1cmUgdG8gYXBwbHkgYSByZWNhbGN1bGF0aW9uIGZ1bmN0aW9uIHRvIHRoZSBBbmltYXRpb25TdHJ1Y3R1cmUgdG8gc3RvcmUgaW4gYSBuZXcgU3RydWN0dXJlLlxuICAgICAqIEBwYXJhbSBfb2xkU3RydWN0dXJlIFRoZSBvbGQgc3RydWN0dXJlIHRvIHRyYXZlcnNlXG4gICAgICogQHBhcmFtIF9mdW5jdGlvblRvVXNlIFRoZSBmdW5jdGlvbiB0byB1c2UgdG8gcmVjYWxjdWxhdGVkIHRoZSBzdHJ1Y3R1cmUuXG4gICAgICogQHJldHVybnMgQSBuZXcgQW5pbWF0aW9uIFN0cnVjdHVyZSB3aXRoIHRoZSByZWNhbHVsYXRlZCBBbmltYXRpb24gU2VxdWVuY2VzLlxuICAgICAqL1xuICAgIHByaXZhdGUgdHJhdmVyc2VTdHJ1Y3R1cmVGb3JOZXdTdHJ1Y3R1cmUoX29sZFN0cnVjdHVyZTogQW5pbWF0aW9uU3RydWN0dXJlLCBfZnVuY3Rpb25Ub1VzZTogRnVuY3Rpb24pOiBBbmltYXRpb25TdHJ1Y3R1cmUge1xuICAgICAgbGV0IG5ld1N0cnVjdHVyZTogQW5pbWF0aW9uU3RydWN0dXJlID0ge307XG4gICAgICBmb3IgKGxldCBuIGluIF9vbGRTdHJ1Y3R1cmUpIHtcbiAgICAgICAgaWYgKF9vbGRTdHJ1Y3R1cmVbbl0gaW5zdGFuY2VvZiBBbmltYXRpb25TZXF1ZW5jZSkge1xuICAgICAgICAgIG5ld1N0cnVjdHVyZVtuXSA9IF9mdW5jdGlvblRvVXNlKF9vbGRTdHJ1Y3R1cmVbbl0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG5ld1N0cnVjdHVyZVtuXSA9IHRoaXMudHJhdmVyc2VTdHJ1Y3R1cmVGb3JOZXdTdHJ1Y3R1cmUoPEFuaW1hdGlvblN0cnVjdHVyZT5fb2xkU3RydWN0dXJlW25dLCBfZnVuY3Rpb25Ub1VzZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBuZXdTdHJ1Y3R1cmU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIHJldmVyc2VkIEFuaW1hdGlvbiBTZXF1ZW5jZSBvdXQgb2YgYSBnaXZlbiBTZXF1ZW5jZS5cbiAgICAgKiBAcGFyYW0gX3NlcXVlbmNlIFRoZSBzZXF1ZW5jZSB0byBjYWxjdWxhdGUgdGhlIG5ldyBzZXF1ZW5jZSBvdXQgb2ZcbiAgICAgKiBAcmV0dXJucyBUaGUgcmV2ZXJzZWQgU2VxdWVuY2VcbiAgICAgKi9cbiAgICBwcml2YXRlIGNhbGN1bGF0ZVJldmVyc2VTZXF1ZW5jZShfc2VxdWVuY2U6IEFuaW1hdGlvblNlcXVlbmNlKTogQW5pbWF0aW9uU2VxdWVuY2Uge1xuICAgICAgbGV0IHNlcTogQW5pbWF0aW9uU2VxdWVuY2UgPSBuZXcgQW5pbWF0aW9uU2VxdWVuY2UoKTtcbiAgICAgIGZvciAobGV0IGk6IG51bWJlciA9IDA7IGkgPCBfc2VxdWVuY2UubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbGV0IG9sZEtleTogQW5pbWF0aW9uS2V5ID0gX3NlcXVlbmNlLmdldEtleShpKTtcbiAgICAgICAgbGV0IGtleTogQW5pbWF0aW9uS2V5ID0gbmV3IEFuaW1hdGlvbktleSh0aGlzLnRvdGFsVGltZSAtIG9sZEtleS5UaW1lLCBvbGRLZXkuVmFsdWUsIG9sZEtleS5TbG9wZU91dCwgb2xkS2V5LlNsb3BlSW4sIG9sZEtleS5Db25zdGFudCk7XG4gICAgICAgIHNlcS5hZGRLZXkoa2V5KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzZXE7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIHJhc3RlcmVkIFtbQW5pbWF0aW9uU2VxdWVuY2VdXSBvdXQgb2YgYSBnaXZlbiBzZXF1ZW5jZS5cbiAgICAgKiBAcGFyYW0gX3NlcXVlbmNlIFRoZSBzZXF1ZW5jZSB0byBjYWxjdWxhdGUgdGhlIG5ldyBzZXF1ZW5jZSBvdXQgb2ZcbiAgICAgKiBAcmV0dXJucyB0aGUgcmFzdGVyZWQgc2VxdWVuY2UuXG4gICAgICovXG4gICAgcHJpdmF0ZSBjYWxjdWxhdGVSYXN0ZXJlZFNlcXVlbmNlKF9zZXF1ZW5jZTogQW5pbWF0aW9uU2VxdWVuY2UpOiBBbmltYXRpb25TZXF1ZW5jZSB7XG4gICAgICBsZXQgc2VxOiBBbmltYXRpb25TZXF1ZW5jZSA9IG5ldyBBbmltYXRpb25TZXF1ZW5jZSgpO1xuICAgICAgbGV0IGZyYW1lVGltZTogbnVtYmVyID0gMTAwMCAvIHRoaXMuZnJhbWVzUGVyU2Vjb25kO1xuICAgICAgZm9yIChsZXQgaTogbnVtYmVyID0gMDsgaSA8IHRoaXMudG90YWxUaW1lOyBpICs9IGZyYW1lVGltZSkge1xuICAgICAgICBsZXQga2V5OiBBbmltYXRpb25LZXkgPSBuZXcgQW5pbWF0aW9uS2V5KGksIF9zZXF1ZW5jZS5ldmFsdWF0ZShpKSwgMCwgMCwgdHJ1ZSk7XG4gICAgICAgIHNlcS5hZGRLZXkoa2V5KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzZXE7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIG5ldyByZXZlcnNlZCBbW0FuaW1hdGlvbkV2ZW50VHJpZ2dlcl1dIG9iamVjdCBiYXNlZCBvbiB0aGUgZ2l2ZW4gb25lLiAgXG4gICAgICogQHBhcmFtIF9ldmVudHMgdGhlIGV2ZW50IG9iamVjdCB0byBjYWxjdWxhdGUgdGhlIG5ldyBvbmUgb3V0IG9mXG4gICAgICogQHJldHVybnMgdGhlIHJldmVyc2VkIGV2ZW50IG9iamVjdFxuICAgICAqL1xuICAgIHByaXZhdGUgY2FsY3VsYXRlUmV2ZXJzZUV2ZW50VHJpZ2dlcnMoX2V2ZW50czogQW5pbWF0aW9uRXZlbnRUcmlnZ2VyKTogQW5pbWF0aW9uRXZlbnRUcmlnZ2VyIHtcbiAgICAgIGxldCBhZTogQW5pbWF0aW9uRXZlbnRUcmlnZ2VyID0ge307XG4gICAgICBmb3IgKGxldCBuYW1lIGluIF9ldmVudHMpIHtcbiAgICAgICAgYWVbbmFtZV0gPSB0aGlzLnRvdGFsVGltZSAtIF9ldmVudHNbbmFtZV07XG4gICAgICB9XG4gICAgICByZXR1cm4gYWU7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSByYXN0ZXJlZCBbW0FuaW1hdGlvbkV2ZW50VHJpZ2dlcl1dIG9iamVjdCBiYXNlZCBvbiB0aGUgZ2l2ZW4gb25lLiAgXG4gICAgICogQHBhcmFtIF9ldmVudHMgdGhlIGV2ZW50IG9iamVjdCB0byBjYWxjdWxhdGUgdGhlIG5ldyBvbmUgb3V0IG9mXG4gICAgICogQHJldHVybnMgdGhlIHJhc3RlcmVkIGV2ZW50IG9iamVjdFxuICAgICAqL1xuICAgIHByaXZhdGUgY2FsY3VsYXRlUmFzdGVyZWRFdmVudFRyaWdnZXJzKF9ldmVudHM6IEFuaW1hdGlvbkV2ZW50VHJpZ2dlcik6IEFuaW1hdGlvbkV2ZW50VHJpZ2dlciB7XG4gICAgICBsZXQgYWU6IEFuaW1hdGlvbkV2ZW50VHJpZ2dlciA9IHt9O1xuICAgICAgbGV0IGZyYW1lVGltZTogbnVtYmVyID0gMTAwMCAvIHRoaXMuZnJhbWVzUGVyU2Vjb25kO1xuICAgICAgZm9yIChsZXQgbmFtZSBpbiBfZXZlbnRzKSB7XG4gICAgICAgIGFlW25hbWVdID0gX2V2ZW50c1tuYW1lXSAtIChfZXZlbnRzW25hbWVdICUgZnJhbWVUaW1lKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBhZTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIHdoaWNoIGV2ZW50cyBsYXkgYmV0d2VlbiB0d28gZ2l2ZW4gdGltZXMgYW5kIHJldHVybnMgdGhlIG5hbWVzIG9mIHRoZSBvbmVzIHRoYXQgZG8uXG4gICAgICogQHBhcmFtIF9ldmVudFRyaWdnZXJzIFRoZSBldmVudCBvYmplY3QgdG8gY2hlY2sgdGhlIGV2ZW50cyBpbnNpZGUgb2ZcbiAgICAgKiBAcGFyYW0gX21pbiB0aGUgbWluaW11bSBvZiB0aGUgcmFuZ2UgdG8gY2hlY2sgYmV0d2VlbiAoaW5jbHVzaXZlKVxuICAgICAqIEBwYXJhbSBfbWF4IHRoZSBtYXhpbXVtIG9mIHRoZSByYW5nZSB0byBjaGVjayBiZXR3ZWVuIChleGNsdXNpdmUpXG4gICAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgdGhlIG5hbWVzIG9mIHRoZSBldmVudHMgaW4gdGhlIGdpdmVuIHJhbmdlLiBcbiAgICAgKi9cbiAgICBwcml2YXRlIGNoZWNrRXZlbnRzQmV0d2VlbihfZXZlbnRUcmlnZ2VyczogQW5pbWF0aW9uRXZlbnRUcmlnZ2VyLCBfbWluOiBudW1iZXIsIF9tYXg6IG51bWJlcik6IHN0cmluZ1tdIHtcbiAgICAgIGxldCBldmVudHNUb1RyaWdnZXI6IHN0cmluZ1tdID0gW107XG4gICAgICBmb3IgKGxldCBuYW1lIGluIF9ldmVudFRyaWdnZXJzKSB7XG4gICAgICAgIGlmIChfbWluIDw9IF9ldmVudFRyaWdnZXJzW25hbWVdICYmIF9ldmVudFRyaWdnZXJzW25hbWVdIDwgX21heCkge1xuICAgICAgICAgIGV2ZW50c1RvVHJpZ2dlci5wdXNoKG5hbWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gZXZlbnRzVG9UcmlnZ2VyO1xuICAgIH1cbiAgfVxufSIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi9UcmFuc2Zlci9TZXJpYWxpemVyLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL1RyYW5zZmVyL011dGFibGUudHNcIi8+XG5cbm5hbWVzcGFjZSBGdWRnZUNvcmUge1xuICAvKipcbiAgICogQ2FsY3VsYXRlcyB0aGUgdmFsdWVzIGJldHdlZW4gW1tBbmltYXRpb25LZXldXXMuXG4gICAqIFJlcHJlc2VudGVkIGludGVybmFsbHkgYnkgYSBjdWJpYyBmdW5jdGlvbiAoYGYoeCkgPSBheMKzICsgYnjCsiArIGN4ICsgZGApLiBcbiAgICogT25seSBuZWVkcyB0byBiZSByZWNhbGN1bGF0ZWQgd2hlbiB0aGUga2V5cyBjaGFuZ2UsIHNvIGF0IHJ1bnRpbWUgaXQgc2hvdWxkIG9ubHkgYmUgY2FsY3VsYXRlZCBvbmNlLlxuICAgKiBAYXV0aG9yIEx1a2FzIFNjaGV1ZXJsZSwgSEZVLCAyMDE5XG4gICAqL1xuICBleHBvcnQgY2xhc3MgQW5pbWF0aW9uRnVuY3Rpb24ge1xuICAgIHByaXZhdGUgYTogbnVtYmVyID0gMDtcbiAgICBwcml2YXRlIGI6IG51bWJlciA9IDA7XG4gICAgcHJpdmF0ZSBjOiBudW1iZXIgPSAwO1xuICAgIHByaXZhdGUgZDogbnVtYmVyID0gMDtcbiAgICBwcml2YXRlIGtleUluOiBBbmltYXRpb25LZXk7XG4gICAgcHJpdmF0ZSBrZXlPdXQ6IEFuaW1hdGlvbktleTtcblxuXG4gICAgY29uc3RydWN0b3IoX2tleUluOiBBbmltYXRpb25LZXksIF9rZXlPdXQ6IEFuaW1hdGlvbktleSA9IG51bGwpIHtcbiAgICAgIHRoaXMua2V5SW4gPSBfa2V5SW47XG4gICAgICB0aGlzLmtleU91dCA9IF9rZXlPdXQ7XG4gICAgICB0aGlzLmNhbGN1bGF0ZSgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIHZhbHVlIG9mIHRoZSBmdW5jdGlvbiBhdCB0aGUgZ2l2ZW4gdGltZS5cbiAgICAgKiBAcGFyYW0gX3RpbWUgdGhlIHBvaW50IGluIHRpbWUgYXQgd2hpY2ggdG8gZXZhbHVhdGUgdGhlIGZ1bmN0aW9uIGluIG1pbGxpc2Vjb25kcy4gV2lsbCBiZSBjb3JyZWN0ZWQgZm9yIG9mZnNldCBpbnRlcm5hbGx5LlxuICAgICAqIEByZXR1cm5zIHRoZSB2YWx1ZSBhdCB0aGUgZ2l2ZW4gdGltZVxuICAgICAqL1xuICAgIGV2YWx1YXRlKF90aW1lOiBudW1iZXIpOiBudW1iZXIge1xuICAgICAgX3RpbWUgLT0gdGhpcy5rZXlJbi5UaW1lO1xuICAgICAgbGV0IHRpbWUyOiBudW1iZXIgPSBfdGltZSAqIF90aW1lO1xuICAgICAgbGV0IHRpbWUzOiBudW1iZXIgPSB0aW1lMiAqIF90aW1lO1xuICAgICAgcmV0dXJuIHRoaXMuYSAqIHRpbWUzICsgdGhpcy5iICogdGltZTIgKyB0aGlzLmMgKiBfdGltZSArIHRoaXMuZDtcbiAgICB9XG5cbiAgICBzZXQgc2V0S2V5SW4oX2tleUluOiBBbmltYXRpb25LZXkpIHtcbiAgICAgIHRoaXMua2V5SW4gPSBfa2V5SW47XG4gICAgICB0aGlzLmNhbGN1bGF0ZSgpO1xuICAgIH1cblxuICAgIHNldCBzZXRLZXlPdXQoX2tleU91dDogQW5pbWF0aW9uS2V5KSB7XG4gICAgICB0aGlzLmtleU91dCA9IF9rZXlPdXQ7XG4gICAgICB0aGlzLmNhbGN1bGF0ZSgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIChSZS0pQ2FsY3VsYXRlcyB0aGUgcGFyYW1ldGVycyBvZiB0aGUgY3ViaWMgZnVuY3Rpb24uXG4gICAgICogU2VlIGh0dHBzOi8vbWF0aC5zdGFja2V4Y2hhbmdlLmNvbS9xdWVzdGlvbnMvMzE3MzQ2OS9jYWxjdWxhdGUtY3ViaWMtZXF1YXRpb24tZnJvbS10d28tcG9pbnRzLWFuZC10d28tc2xvcGVzLXZhcmlhYmx5XG4gICAgICogYW5kIGh0dHBzOi8vamlya2FkZWxsb3JvLmdpdGh1Yi5pby9GVURHRS9Eb2N1bWVudGF0aW9uL0xvZ3MvMTkwNDEwX05vdGl6ZW5fTFNcbiAgICAgKi9cbiAgICBjYWxjdWxhdGUoKTogdm9pZCB7XG4gICAgICBpZiAoIXRoaXMua2V5SW4pIHtcbiAgICAgICAgdGhpcy5kID0gdGhpcy5jID0gdGhpcy5iID0gdGhpcy5hID0gMDtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKCF0aGlzLmtleU91dCB8fCB0aGlzLmtleUluLkNvbnN0YW50KSB7XG4gICAgICAgIHRoaXMuZCA9IHRoaXMua2V5SW4uVmFsdWU7XG4gICAgICAgIHRoaXMuYyA9IHRoaXMuYiA9IHRoaXMuYSA9IDA7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgbGV0IHgxOiBudW1iZXIgPSB0aGlzLmtleU91dC5UaW1lIC0gdGhpcy5rZXlJbi5UaW1lO1xuXG4gICAgICB0aGlzLmQgPSB0aGlzLmtleUluLlZhbHVlO1xuICAgICAgdGhpcy5jID0gdGhpcy5rZXlJbi5TbG9wZU91dDtcblxuICAgICAgdGhpcy5hID0gKC14MSAqICh0aGlzLmtleUluLlNsb3BlT3V0ICsgdGhpcy5rZXlPdXQuU2xvcGVJbikgLSAyICogdGhpcy5rZXlJbi5WYWx1ZSArIDIgKiB0aGlzLmtleU91dC5WYWx1ZSkgLyAtTWF0aC5wb3coeDEsIDMpO1xuICAgICAgdGhpcy5iID0gKHRoaXMua2V5T3V0LlNsb3BlSW4gLSB0aGlzLmtleUluLlNsb3BlT3V0IC0gMyAqIHRoaXMuYSAqIE1hdGgucG93KHgxLCAyKSkgLyAoMiAqIHgxKTtcbiAgICB9XG4gIH1cblxufSIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi9UcmFuc2Zlci9TZXJpYWxpemVyLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL1RyYW5zZmVyL011dGFibGUudHNcIi8+XG5cbm5hbWVzcGFjZSBGdWRnZUNvcmUge1xuICAvKipcbiAgICogSG9sZHMgaW5mb3JtYXRpb24gYWJvdXQgc2V0IHBvaW50cyBpbiB0aW1lLCB0aGVpciBhY2NvbXBhbnlpbmcgdmFsdWVzIGFzIHdlbGwgYXMgdGhlaXIgc2xvcGVzLiBcbiAgICogQWxzbyBob2xkcyBhIHJlZmVyZW5jZSB0byB0aGUgW1tBbmltYXRpb25GdW5jdGlvbl1dcyB0aGF0IGNvbWUgaW4gYW5kIG91dCBvZiB0aGUgc2lkZXMuIFRoZSBbW0FuaW1hdGlvbkZ1bmN0aW9uXV1zIGFyZSBoYW5kbGVkIGJ5IHRoZSBbW0FuaW1hdGlvblNlcXVlbmNlXV1zLlxuICAgKiBTYXZlZCBpbnNpZGUgYW4gW1tBbmltYXRpb25TZXF1ZW5jZV1dLlxuICAgKiBAYXV0aG9yIEx1a2FzIFNjaGV1ZXJsZSwgSEZVLCAyMDE5XG4gICAqL1xuICBleHBvcnQgY2xhc3MgQW5pbWF0aW9uS2V5IGV4dGVuZHMgTXV0YWJsZSBpbXBsZW1lbnRzIFNlcmlhbGl6YWJsZSB7XG4gICAgLy8gVE9ETzogY2hlY2sgaWYgZnVuY3Rpb25JbiBjYW4gYmUgcmVtb3ZlZFxuICAgIC8qKkRvbid0IG1vZGlmeSB0aGlzIHVubGVzcyB5b3Uga25vdyB3aGF0IHlvdSdyZSBkb2luZy4qL1xuICAgIGZ1bmN0aW9uSW46IEFuaW1hdGlvbkZ1bmN0aW9uO1xuICAgIC8qKkRvbid0IG1vZGlmeSB0aGlzIHVubGVzcyB5b3Uga25vdyB3aGF0IHlvdSdyZSBkb2luZy4qL1xuICAgIGZ1bmN0aW9uT3V0OiBBbmltYXRpb25GdW5jdGlvbjtcbiAgICBcbiAgICBicm9rZW46IGJvb2xlYW47XG5cbiAgICBwcml2YXRlIHRpbWU6IG51bWJlcjtcbiAgICBwcml2YXRlIHZhbHVlOiBudW1iZXI7XG4gICAgcHJpdmF0ZSBjb25zdGFudDogYm9vbGVhbiA9IGZhbHNlO1xuXG4gICAgcHJpdmF0ZSBzbG9wZUluOiBudW1iZXIgPSAwO1xuICAgIHByaXZhdGUgc2xvcGVPdXQ6IG51bWJlciA9IDA7XG5cbiAgICBjb25zdHJ1Y3RvcihfdGltZTogbnVtYmVyID0gMCwgX3ZhbHVlOiBudW1iZXIgPSAwLCBfc2xvcGVJbjogbnVtYmVyID0gMCwgX3Nsb3BlT3V0OiBudW1iZXIgPSAwLCBfY29uc3RhbnQ6IGJvb2xlYW4gPSBmYWxzZSkge1xuICAgICAgc3VwZXIoKTtcbiAgICAgIHRoaXMudGltZSA9IF90aW1lO1xuICAgICAgdGhpcy52YWx1ZSA9IF92YWx1ZTtcbiAgICAgIHRoaXMuc2xvcGVJbiA9IF9zbG9wZUluO1xuICAgICAgdGhpcy5zbG9wZU91dCA9IF9zbG9wZU91dDtcbiAgICAgIHRoaXMuY29uc3RhbnQgPSBfY29uc3RhbnQ7XG5cbiAgICAgIHRoaXMuYnJva2VuID0gdGhpcy5zbG9wZUluICE9IC10aGlzLnNsb3BlT3V0O1xuICAgICAgdGhpcy5mdW5jdGlvbk91dCA9IG5ldyBBbmltYXRpb25GdW5jdGlvbih0aGlzLCBudWxsKTtcbiAgICB9XG5cbiAgICBnZXQgVGltZSgpOiBudW1iZXIge1xuICAgICAgcmV0dXJuIHRoaXMudGltZTtcbiAgICB9XG5cbiAgICBzZXQgVGltZShfdGltZTogbnVtYmVyKSB7XG4gICAgICB0aGlzLnRpbWUgPSBfdGltZTtcbiAgICAgIHRoaXMuZnVuY3Rpb25Jbi5jYWxjdWxhdGUoKTtcbiAgICAgIHRoaXMuZnVuY3Rpb25PdXQuY2FsY3VsYXRlKCk7XG4gICAgfVxuXG4gICAgZ2V0IFZhbHVlKCk6IG51bWJlciB7XG4gICAgICByZXR1cm4gdGhpcy52YWx1ZTtcbiAgICB9XG5cbiAgICBzZXQgVmFsdWUoX3ZhbHVlOiBudW1iZXIpIHtcbiAgICAgIHRoaXMudmFsdWUgPSBfdmFsdWU7XG4gICAgICB0aGlzLmZ1bmN0aW9uSW4uY2FsY3VsYXRlKCk7XG4gICAgICB0aGlzLmZ1bmN0aW9uT3V0LmNhbGN1bGF0ZSgpO1xuICAgIH1cbiAgICBcbiAgICBnZXQgQ29uc3RhbnQoKTogYm9vbGVhbiB7XG4gICAgICByZXR1cm4gdGhpcy5jb25zdGFudDtcbiAgICB9XG5cbiAgICBzZXQgQ29uc3RhbnQoX2NvbnN0YW50OiBib29sZWFuKSB7XG4gICAgICB0aGlzLmNvbnN0YW50ID0gX2NvbnN0YW50O1xuICAgICAgdGhpcy5mdW5jdGlvbkluLmNhbGN1bGF0ZSgpO1xuICAgICAgdGhpcy5mdW5jdGlvbk91dC5jYWxjdWxhdGUoKTtcbiAgICB9XG5cbiAgICBnZXQgU2xvcGVJbigpOiBudW1iZXIge1xuICAgICAgcmV0dXJuIHRoaXMuc2xvcGVJbjtcbiAgICB9XG4gICAgXG4gICAgc2V0IFNsb3BlSW4oX3Nsb3BlOiBudW1iZXIpIHtcbiAgICAgIHRoaXMuc2xvcGVJbiA9IF9zbG9wZTtcbiAgICAgIHRoaXMuZnVuY3Rpb25Jbi5jYWxjdWxhdGUoKTtcbiAgICB9XG5cbiAgICBnZXQgU2xvcGVPdXQoKTogbnVtYmVyIHtcbiAgICAgIHJldHVybiB0aGlzLnNsb3BlT3V0O1xuICAgIH1cblxuICAgIHNldCBTbG9wZU91dChfc2xvcGU6IG51bWJlcikge1xuICAgICAgdGhpcy5zbG9wZU91dCA9IF9zbG9wZTtcbiAgICAgIHRoaXMuZnVuY3Rpb25PdXQuY2FsY3VsYXRlKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU3RhdGljIGNvbXBhcmF0aW9uIGZ1bmN0aW9uIHRvIHVzZSBpbiBhbiBhcnJheSBzb3J0IGZ1bmN0aW9uIHRvIHNvcnQgdGhlIGtleXMgYnkgdGhlaXIgdGltZS5cbiAgICAgKiBAcGFyYW0gX2EgdGhlIGFuaW1hdGlvbiBrZXkgdG8gY2hlY2tcbiAgICAgKiBAcGFyYW0gX2IgdGhlIGFuaW1hdGlvbiBrZXkgdG8gY2hlY2sgYWdhaW5zdFxuICAgICAqIEByZXR1cm5zID4wIGlmIGE+YiwgMCBpZiBhPWIsIDwwIGlmIGE8YlxuICAgICAqL1xuICAgIHN0YXRpYyBjb21wYXJlKF9hOiBBbmltYXRpb25LZXksIF9iOiBBbmltYXRpb25LZXkpOiBudW1iZXIge1xuICAgICAgcmV0dXJuIF9hLnRpbWUgLSBfYi50aW1lO1xuICAgIH1cblxuICAgIC8vI3JlZ2lvbiB0cmFuc2ZlclxuICAgIHNlcmlhbGl6ZSgpOiBTZXJpYWxpemF0aW9uIHtcbiAgICAgIGxldCBzOiBTZXJpYWxpemF0aW9uID0ge307XG4gICAgICBzLnRpbWUgPSB0aGlzLnRpbWU7XG4gICAgICBzLnZhbHVlID0gdGhpcy52YWx1ZTtcbiAgICAgIHMuc2xvcGVJbiA9IHRoaXMuc2xvcGVJbjtcbiAgICAgIHMuc2xvcGVPdXQgPSB0aGlzLnNsb3BlT3V0O1xuICAgICAgcy5jb25zdGFudCA9IHRoaXMuY29uc3RhbnQ7XG4gICAgICByZXR1cm4gcztcbiAgICB9XG5cbiAgICBkZXNlcmlhbGl6ZShfc2VyaWFsaXphdGlvbjogU2VyaWFsaXphdGlvbik6IFNlcmlhbGl6YWJsZSB7XG4gICAgICB0aGlzLnRpbWUgPSBfc2VyaWFsaXphdGlvbi50aW1lO1xuICAgICAgdGhpcy52YWx1ZSA9IF9zZXJpYWxpemF0aW9uLnZhbHVlO1xuICAgICAgdGhpcy5zbG9wZUluID0gX3NlcmlhbGl6YXRpb24uc2xvcGVJbjtcbiAgICAgIHRoaXMuc2xvcGVPdXQgPSBfc2VyaWFsaXphdGlvbi5zbG9wZU91dDtcbiAgICAgIHRoaXMuY29uc3RhbnQgPSBfc2VyaWFsaXphdGlvbi5jb25zdGFudDtcblxuICAgICAgdGhpcy5icm9rZW4gPSB0aGlzLnNsb3BlSW4gIT0gLXRoaXMuc2xvcGVPdXQ7XG5cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGdldE11dGF0b3IoKTogTXV0YXRvciB7XG4gICAgICByZXR1cm4gdGhpcy5zZXJpYWxpemUoKTtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgcmVkdWNlTXV0YXRvcihfbXV0YXRvcjogTXV0YXRvcik6IHZvaWQge1xuICAgICAgLy9cbiAgICB9XG4gICAgLy8jZW5kcmVnaW9uXG5cbiAgfVxuXG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL1RyYW5zZmVyL1NlcmlhbGl6ZXIudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vVHJhbnNmZXIvTXV0YWJsZS50c1wiLz5cblxubmFtZXNwYWNlIEZ1ZGdlQ29yZSB7XG4gIC8qKlxuICAgKiBBIHNlcXVlbmNlIG9mIFtbQW5pbWF0aW9uS2V5XV1zIHRoYXQgaXMgbWFwcGVkIHRvIGFuIGF0dHJpYnV0ZSBvZiBhIFtbTm9kZV1dIG9yIGl0cyBbW0NvbXBvbmVudF1dcyBpbnNpZGUgdGhlIFtbQW5pbWF0aW9uXV0uXG4gICAqIFByb3ZpZGVzIGZ1bmN0aW9ucyB0byBtb2RpZnkgc2FpZCBrZXlzXG4gICAqIEBhdXRob3IgTHVrYXMgU2NoZXVlcmxlLCBIRlUsIDIwMTlcbiAgICovXG4gIGV4cG9ydCBjbGFzcyBBbmltYXRpb25TZXF1ZW5jZSBleHRlbmRzIE11dGFibGUgaW1wbGVtZW50cyBTZXJpYWxpemFibGUge1xuICAgIHByaXZhdGUga2V5czogQW5pbWF0aW9uS2V5W10gPSBbXTtcblxuICAgIC8qKlxuICAgICAqIEV2YWx1YXRlcyB0aGUgc2VxdWVuY2UgYXQgdGhlIGdpdmVuIHBvaW50IGluIHRpbWUuXG4gICAgICogQHBhcmFtIF90aW1lIHRoZSBwb2ludCBpbiB0aW1lIGF0IHdoaWNoIHRvIGV2YWx1YXRlIHRoZSBzZXF1ZW5jZSBpbiBtaWxsaXNlY29uZHMuXG4gICAgICogQHJldHVybnMgdGhlIHZhbHVlIG9mIHRoZSBzZXF1ZW5jZSBhdCB0aGUgZ2l2ZW4gdGltZS4gMCBpZiB0aGVyZSBhcmUgbm8ga2V5cy5cbiAgICAgKi9cbiAgICBldmFsdWF0ZShfdGltZTogbnVtYmVyKTogbnVtYmVyIHtcbiAgICAgIGlmICh0aGlzLmtleXMubGVuZ3RoID09IDApXG4gICAgICAgIHJldHVybiAwOyAvL1RPRE86IHNob3VsZG4ndCByZXR1cm4gMCBidXQgc29tZXRoaW5nIGluZGljYXRpbmcgbm8gY2hhbmdlLCBsaWtlIG51bGwuIHByb2JhYmx5IG5lZWRzIHRvIGJlIGNoYW5nZWQgaW4gTm9kZSBhcyB3ZWxsIHRvIGlnbm9yZSBub24tbnVtZXJpYyB2YWx1ZXMgaW4gdGhlIGFwcGx5QW5pbWF0aW9uIGZ1bmN0aW9uXG4gICAgICBpZiAodGhpcy5rZXlzLmxlbmd0aCA9PSAxIHx8IHRoaXMua2V5c1swXS5UaW1lID49IF90aW1lKVxuICAgICAgICByZXR1cm4gdGhpcy5rZXlzWzBdLlZhbHVlO1xuXG5cbiAgICAgIGZvciAobGV0IGk6IG51bWJlciA9IDA7IGkgPCB0aGlzLmtleXMubGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgICAgIGlmICh0aGlzLmtleXNbaV0uVGltZSA8PSBfdGltZSAmJiB0aGlzLmtleXNbaSArIDFdLlRpbWUgPiBfdGltZSkge1xuICAgICAgICAgIHJldHVybiB0aGlzLmtleXNbaV0uZnVuY3Rpb25PdXQuZXZhbHVhdGUoX3RpbWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5rZXlzW3RoaXMua2V5cy5sZW5ndGggLSAxXS5WYWx1ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBZGRzIGEgbmV3IGtleSB0byB0aGUgc2VxdWVuY2UuXG4gICAgICogQHBhcmFtIF9rZXkgdGhlIGtleSB0byBhZGRcbiAgICAgKi9cbiAgICBhZGRLZXkoX2tleTogQW5pbWF0aW9uS2V5KTogdm9pZCB7XG4gICAgICB0aGlzLmtleXMucHVzaChfa2V5KTtcbiAgICAgIHRoaXMua2V5cy5zb3J0KEFuaW1hdGlvbktleS5jb21wYXJlKTtcbiAgICAgIHRoaXMucmVnZW5lcmF0ZUZ1bmN0aW9ucygpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgYSBnaXZlbiBrZXkgZnJvbSB0aGUgc2VxdWVuY2UuXG4gICAgICogQHBhcmFtIF9rZXkgdGhlIGtleSB0byByZW1vdmVcbiAgICAgKi9cbiAgICByZW1vdmVLZXkoX2tleTogQW5pbWF0aW9uS2V5KTogdm9pZCB7XG4gICAgICBmb3IgKGxldCBpOiBudW1iZXIgPSAwOyBpIDwgdGhpcy5rZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmICh0aGlzLmtleXNbaV0gPT0gX2tleSkge1xuICAgICAgICAgIHRoaXMua2V5cy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgdGhpcy5yZWdlbmVyYXRlRnVuY3Rpb25zKCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlcyB0aGUgQW5pbWF0aW9uIEtleSBhdCB0aGUgZ2l2ZW4gaW5kZXggZnJvbSB0aGUga2V5cy5cbiAgICAgKiBAcGFyYW0gX2luZGV4IHRoZSB6ZXJvLWJhc2VkIGluZGV4IGF0IHdoaWNoIHRvIHJlbW92ZSB0aGUga2V5XG4gICAgICogQHJldHVybnMgdGhlIHJlbW92ZWQgQW5pbWF0aW9uS2V5IGlmIHN1Y2Nlc3NmdWwsIG51bGwgb3RoZXJ3aXNlLlxuICAgICAqL1xuICAgIHJlbW92ZUtleUF0SW5kZXgoX2luZGV4OiBudW1iZXIpOiBBbmltYXRpb25LZXkge1xuICAgICAgaWYgKF9pbmRleCA8IDAgfHwgX2luZGV4ID49IHRoaXMua2V5cy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICBsZXQgYWs6IEFuaW1hdGlvbktleSA9IHRoaXMua2V5c1tfaW5kZXhdO1xuICAgICAgdGhpcy5rZXlzLnNwbGljZShfaW5kZXgsIDEpO1xuICAgICAgdGhpcy5yZWdlbmVyYXRlRnVuY3Rpb25zKCk7XG4gICAgICByZXR1cm4gYWs7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0cyBhIGtleSBmcm9tIHRoZSBzZXF1ZW5jZSBhdCB0aGUgZGVzaXJlZCBpbmRleC5cbiAgICAgKiBAcGFyYW0gX2luZGV4IHRoZSB6ZXJvLWJhc2VkIGluZGV4IGF0IHdoaWNoIHRvIGdldCB0aGUga2V5XG4gICAgICogQHJldHVybnMgdGhlIEFuaW1hdGlvbktleSBhdCB0aGUgaW5kZXggaWYgaXQgZXhpc3RzLCBudWxsIG90aGVyd2lzZS5cbiAgICAgKi9cbiAgICBnZXRLZXkoX2luZGV4OiBudW1iZXIpOiBBbmltYXRpb25LZXkge1xuICAgICAgaWYgKF9pbmRleCA8IDAgfHwgX2luZGV4ID49IHRoaXMua2V5cy5sZW5ndGgpXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgcmV0dXJuIHRoaXMua2V5c1tfaW5kZXhdO1xuICAgIH1cblxuICAgIGdldCBsZW5ndGgoKTogbnVtYmVyIHtcbiAgICAgIHJldHVybiB0aGlzLmtleXMubGVuZ3RoO1xuICAgIH1cblxuICAgIC8vI3JlZ2lvbiB0cmFuc2ZlclxuICAgIHNlcmlhbGl6ZSgpOiBTZXJpYWxpemF0aW9uIHtcbiAgICAgIGxldCBzOiBTZXJpYWxpemF0aW9uID0ge1xuICAgICAgICBrZXlzOiBbXSxcbiAgICAgICAgYW5pbWF0aW9uU2VxdWVuY2U6IHRydWVcbiAgICAgIH07XG4gICAgICBmb3IgKGxldCBpOiBudW1iZXIgPSAwOyBpIDwgdGhpcy5rZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHMua2V5c1tpXSA9IHRoaXMua2V5c1tpXS5zZXJpYWxpemUoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzO1xuICAgIH1cbiAgICBkZXNlcmlhbGl6ZShfc2VyaWFsaXphdGlvbjogU2VyaWFsaXphdGlvbik6IFNlcmlhbGl6YWJsZSB7XG4gICAgICBmb3IgKGxldCBpOiBudW1iZXIgPSAwOyBpIDwgX3NlcmlhbGl6YXRpb24ua2V5cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAvLyB0aGlzLmtleXMucHVzaCg8QW5pbWF0aW9uS2V5PlNlcmlhbGl6ZXIuZGVzZXJpYWxpemUoX3NlcmlhbGl6YXRpb24ua2V5c1tpXSkpO1xuICAgICAgICBsZXQgazogQW5pbWF0aW9uS2V5ID0gbmV3IEFuaW1hdGlvbktleSgpO1xuICAgICAgICBrLmRlc2VyaWFsaXplKF9zZXJpYWxpemF0aW9uLmtleXNbaV0pO1xuICAgICAgICB0aGlzLmtleXNbaV0gPSBrO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnJlZ2VuZXJhdGVGdW5jdGlvbnMoKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgcmVkdWNlTXV0YXRvcihfbXV0YXRvcjogTXV0YXRvcik6IHZvaWQge1xuICAgICAgLy9cbiAgICB9XG4gICAgLy8jZW5kcmVnaW9uXG5cbiAgICAvKipcbiAgICAgKiBVdGlsaXR5IGZ1bmN0aW9uIHRoYXQgKHJlLSlnZW5lcmF0ZXMgYWxsIGZ1bmN0aW9ucyBpbiB0aGUgc2VxdWVuY2UuXG4gICAgICovXG4gICAgcHJpdmF0ZSByZWdlbmVyYXRlRnVuY3Rpb25zKCk6IHZvaWQge1xuICAgICAgZm9yIChsZXQgaTogbnVtYmVyID0gMDsgaSA8IHRoaXMua2V5cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBsZXQgZjogQW5pbWF0aW9uRnVuY3Rpb24gPSBuZXcgQW5pbWF0aW9uRnVuY3Rpb24odGhpcy5rZXlzW2ldKTtcbiAgICAgICAgdGhpcy5rZXlzW2ldLmZ1bmN0aW9uT3V0ID0gZjtcbiAgICAgICAgaWYgKGkgPT0gdGhpcy5rZXlzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAvL1RPRE86IGNoZWNrIGlmIHRoaXMgaXMgZXZlbiB1c2VmdWwuIE1heWJlIHVwZGF0ZSB0aGUgcnVuY29uZGl0aW9uIHRvIGxlbmd0aCAtIDEgaW5zdGVhZC4gTWlnaHQgYmUgcmVkdW5kYW50IGlmIGZ1bmN0aW9uSW4gaXMgcmVtb3ZlZCwgc2VlIFRPRE8gaW4gQW5pbWF0aW9uS2V5LlxuICAgICAgICAgIGYuc2V0S2V5T3V0ID0gdGhpcy5rZXlzWzBdO1xuICAgICAgICAgIHRoaXMua2V5c1swXS5mdW5jdGlvbkluID0gZjtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBmLnNldEtleU91dCA9IHRoaXMua2V5c1tpICsgMV07XG4gICAgICAgIHRoaXMua2V5c1tpICsgMV0uZnVuY3Rpb25JbiA9IGY7XG4gICAgICB9XG4gICAgfVxuICB9XG59IiwibmFtZXNwYWNlIEZ1ZGdlQ29yZSB7XHJcbiAgICAvKipcclxuICAgICAqIERlc2NyaWJlcyB0aGUgW1tBdWRpb11dIGNsYXNzIGluIHdoaWNoIGFsbCBBdWRpbyBEYXRhIGlzIHN0b3JlZC5cclxuICAgICAqIEF1ZGlvIHdpbGwgYmUgZ2l2ZW4gdG8gdGhlIFtbQ29tcG9uZW50QXVkaW9dXSBmb3IgZnVydGhlciB1c2FnZS5cclxuICAgICAqIEBhdXRob3JzIFRob21hcyBEb3JuZXIsIEhGVSwgMjAxOVxyXG4gICAgICovXHJcbiAgICBleHBvcnQgY2xhc3MgQXVkaW8ge1xyXG5cclxuICAgICAgICBwdWJsaWMgdXJsOiBzdHJpbmc7XHJcblxyXG4gICAgICAgIHB1YmxpYyBhdWRpb0J1ZmZlcjogQXVkaW9CdWZmZXI7XHJcbiAgICAgICAgcHJpdmF0ZSBidWZmZXJTb3VyY2U6IEF1ZGlvQnVmZmVyU291cmNlTm9kZTtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBsb2NhbEdhaW46IEdhaW5Ob2RlO1xyXG4gICAgICAgIHByaXZhdGUgbG9jYWxHYWluVmFsdWU6IG51bWJlcjtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBpc0xvb3Bpbmc6IGJvb2xlYW47XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIENvbnN0cnVjdG9yIGZvciB0aGUgW1tBdWRpb11dIENsYXNzXHJcbiAgICAgICAgICogQHBhcmFtIF9hdWRpb0NvbnRleHQgZnJvbSBbW0F1ZGlvU2V0dGluZ3NdXVxyXG4gICAgICAgICAqIEBwYXJhbSBfZ2FpblZhbHVlIDAgZm9yIG11dGVkIHwgMSBmb3IgbWF4IHZvbHVtZVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9hdWRpb1NldHRpbmdzOiBBdWRpb1NldHRpbmdzLCBfdXJsOiBzdHJpbmcsIF9nYWluVmFsdWU6IG51bWJlciwgX2xvb3A6IGJvb2xlYW4pIHtcclxuICAgICAgICAgICAgdGhpcy5pbml0KF9hdWRpb1NldHRpbmdzLCBfdXJsLCBfZ2FpblZhbHVlLCBfbG9vcCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgYXN5bmMgaW5pdChfYXVkaW9TZXR0aW5nczogQXVkaW9TZXR0aW5ncywgX3VybDogc3RyaW5nLCBfZ2FpblZhbHVlOiBudW1iZXIsIF9sb29wOiBib29sZWFuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAgICAgICAgIHRoaXMudXJsID0gX3VybDtcclxuICAgICAgICAgICAgLy8gR2V0IEF1ZGlvQnVmZmVyXHJcbiAgICAgICAgICAgIGNvbnN0IGJ1ZmZlclByb206IFByb21pc2U8QXVkaW9CdWZmZXI+ID0gX2F1ZGlvU2V0dGluZ3MuZ2V0QXVkaW9TZXNzaW9uKCkudXJsVG9CdWZmZXIoX2F1ZGlvU2V0dGluZ3MuZ2V0QXVkaW9Db250ZXh0KCksIF91cmwpO1xyXG4gICAgICAgICAgICB3aGlsZSAoIWJ1ZmZlclByb20pIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiV2FpdGluZyBmb3IgUHJvbWlzZS4uXCIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGF3YWl0IGJ1ZmZlclByb20udGhlbih2YWwgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hdWRpb0J1ZmZlciA9IHZhbDtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICB0aGlzLmxvY2FsR2FpbiA9IF9hdWRpb1NldHRpbmdzLmdldEF1ZGlvQ29udGV4dCgpLmNyZWF0ZUdhaW4oKTtcclxuICAgICAgICAgICAgdGhpcy5sb2NhbEdhaW5WYWx1ZSA9IF9nYWluVmFsdWU7XHJcbiAgICAgICAgICAgIHRoaXMubG9jYWxHYWluLmdhaW4udmFsdWUgPSB0aGlzLmxvY2FsR2FpblZhbHVlO1xyXG4gICAgICAgICAgICB0aGlzLmNyZWF0ZUF1ZGlvKF9hdWRpb1NldHRpbmdzLCB0aGlzLmF1ZGlvQnVmZmVyKTtcclxuICAgICAgICAgICAgdGhpcy5pc0xvb3BpbmcgPSBfbG9vcDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBpbml0QnVmZmVyU291cmNlKF9hdWRpb1NldHRpbmdzOiBBdWRpb1NldHRpbmdzKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuYnVmZmVyU291cmNlID0gX2F1ZGlvU2V0dGluZ3MuZ2V0QXVkaW9Db250ZXh0KCkuY3JlYXRlQnVmZmVyU291cmNlKCk7XHJcbiAgICAgICAgICAgIHRoaXMuYnVmZmVyU291cmNlLmJ1ZmZlciA9IHRoaXMuYXVkaW9CdWZmZXI7XHJcbiAgICAgICAgICAgIHRoaXMuYmVnaW5Mb29wKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0QnVmZmVyU291cmNlTm9kZShfYnVmZmVyU291cmNlTm9kZTogQXVkaW9CdWZmZXJTb3VyY2VOb2RlKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuYnVmZmVyU291cmNlID0gX2J1ZmZlclNvdXJjZU5vZGU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0QnVmZmVyU291cmNlTm9kZSgpOiBBdWRpb0J1ZmZlclNvdXJjZU5vZGUge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5idWZmZXJTb3VyY2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0TG9jYWxHYWluKF9sb2NhbEdhaW46IEdhaW5Ob2RlKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMubG9jYWxHYWluID0gX2xvY2FsR2FpbjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRMb2NhbEdhaW4oKTogR2Fpbk5vZGUge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5sb2NhbEdhaW47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0TG9jYWxHYWluVmFsdWUoX2xvY2FsR2FpblZhbHVlOiBudW1iZXIpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5sb2NhbEdhaW5WYWx1ZSA9IF9sb2NhbEdhaW5WYWx1ZTtcclxuICAgICAgICAgICAgdGhpcy5sb2NhbEdhaW4uZ2Fpbi52YWx1ZSA9IHRoaXMubG9jYWxHYWluVmFsdWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0TG9jYWxHYWluVmFsdWUoKTogbnVtYmVyIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubG9jYWxHYWluVmFsdWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0TG9vcGluZyhfaXNMb29waW5nOiBib29sZWFuKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuaXNMb29waW5nID0gX2lzTG9vcGluZztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRMb29waW5nKCk6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pc0xvb3Bpbmc7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0QnVmZmVyU291cmNlKF9idWZmZXI6IEF1ZGlvQnVmZmVyKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuYXVkaW9CdWZmZXIgPSBfYnVmZmVyO1xyXG4gICAgICAgICAgICB0aGlzLmJ1ZmZlclNvdXJjZS5idWZmZXIgPSBfYnVmZmVyO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldEJ1ZmZlclNvdXJjZSgpOiBBdWRpb0J1ZmZlciB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmF1ZGlvQnVmZmVyO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogY3JlYXRlQXVkaW8gYnVpbGRzIGFuIFtbQXVkaW9dXSB0byB1c2Ugd2l0aCB0aGUgW1tDb21wb25lbnRBdWRpb11dXHJcbiAgICAgICAgICogQHBhcmFtIF9hdWRpb0NvbnRleHQgZnJvbSBbW0F1ZGlvU2V0dGluZ3NdXVxyXG4gICAgICAgICAqIEBwYXJhbSBfYXVkaW9CdWZmZXIgZnJvbSBbW0F1ZGlvU2Vzc2lvbkRhdGFdXVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHByaXZhdGUgY3JlYXRlQXVkaW8oX2F1ZGlvU2V0dGluZ3M6IEF1ZGlvU2V0dGluZ3MsIF9hdWRpb0J1ZmZlcjogQXVkaW9CdWZmZXIpOiBBdWRpb0J1ZmZlciB7XHJcbiAgICAgICAgICAgIHRoaXMuYXVkaW9CdWZmZXIgPSBfYXVkaW9CdWZmZXI7XHJcbiAgICAgICAgICAgIHRoaXMuaW5pdEJ1ZmZlclNvdXJjZShfYXVkaW9TZXR0aW5ncyk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmF1ZGlvQnVmZmVyO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBiZWdpbkxvb3AoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuYnVmZmVyU291cmNlLmxvb3AgPSB0aGlzLmlzTG9vcGluZztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgRnVkZ2VDb3JlIHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEFkZCBhbiBbW0F1ZGlvRGVsYXldXSB0byBhbiBbW0F1ZGlvXV1cclxuICAgICAqIEBhdXRob3JzIFRob21hcyBEb3JuZXIsIEhGVSwgMjAxOVxyXG4gICAgICovXHJcbiAgICBleHBvcnQgY2xhc3MgQXVkaW9EZWxheSB7XHJcblxyXG4gICAgICAgIHB1YmxpYyBhdWRpb0RlbGF5OiBEZWxheU5vZGU7XHJcbiAgICAgICAgcHJpdmF0ZSBkZWxheTogbnVtYmVyO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9hdWRpb1NldHRpbmdzOiBBdWRpb1NldHRpbmdzLCBfZGVsYXk6IG51bWJlcikge1xyXG4gICAgICAgICAgICB0aGlzLmF1ZGlvRGVsYXkgPSBfYXVkaW9TZXR0aW5ncy5nZXRBdWRpb0NvbnRleHQoKS5jcmVhdGVEZWxheShfZGVsYXkpO1xyXG4gICAgICAgICAgICB0aGlzLnNldERlbGF5KF9hdWRpb1NldHRpbmdzLCBfZGVsYXkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHNldERlbGF5KF9hdWRpb1NldHRpbmdzOiBBdWRpb1NldHRpbmdzLCBfZGVsYXk6IG51bWJlcik6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmRlbGF5ID0gX2RlbGF5O1xyXG4gICAgICAgICAgICB0aGlzLmF1ZGlvRGVsYXkuZGVsYXlUaW1lLnNldFZhbHVlQXRUaW1lKHRoaXMuZGVsYXksIF9hdWRpb1NldHRpbmdzLmdldEF1ZGlvQ29udGV4dCgpLmN1cnJlbnRUaW1lKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXREZWxheSgpOiBudW1iZXIge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5kZWxheTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgRnVkZ2VDb3JlIHtcclxuICAgIFxyXG4gICAgLyoqXHJcbiAgICAgKiBBbGwgcG9zc2libGUgRmlsdGVyIFR5cGVzIG9mIGFuIEF1ZGlvIEZpbHRlclxyXG4gICAgICovXHJcbiAgICB0eXBlIEZJTFRFUl9UWVBFID0gXCJsb3dwYXNzXCIgfCBcImhpZ2hwYXNzXCIgfCBcImJhbmRwYXNzXCIgfCBcImxvd3NoZWxmXCIgfCBcImhpZ2hzaGVsZlwiIHwgXCJwZWFraW5nXCIgfCBcIm5vdGNoXCIgfCBcImFsbHBhc3NcIjtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEFkZCBhbiBbW0F1ZGlvRmlsdGVyXV0gdG8gYW4gW1tBdWRpb11dXHJcbiAgICAgKiBAYXV0aG9ycyBUaG9tYXMgRG9ybmVyLCBIRlUsIDIwMTlcclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGNsYXNzIEF1ZGlvRmlsdGVyIHtcclxuXHJcbiAgICAgICAgcHVibGljIGF1ZGlvRmlsdGVyOiBCaXF1YWRGaWx0ZXJOb2RlOyBcclxuICAgICAgICBwcml2YXRlIGZpbHRlclR5cGU6IEZJTFRFUl9UWVBFO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9hdWRpb1NldHRpbmdzOiBBdWRpb1NldHRpbmdzLCBfZmlsdGVyVHlwZTogRklMVEVSX1RZUEUsIF9mcmVxdWVuY3k6IG51bWJlciwgX2dhaW46IG51bWJlciwgX3F1YWxpdHk6IG51bWJlcikge1xyXG4gICAgICAgICAgICB0aGlzLmluaXRGaWx0ZXIoX2F1ZGlvU2V0dGluZ3MsIF9maWx0ZXJUeXBlLCBfZnJlcXVlbmN5LCBfZ2FpbiwgX3F1YWxpdHkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGluaXRGaWx0ZXIoX2F1ZGlvU2V0dGluZ3M6IEF1ZGlvU2V0dGluZ3MsIF9maWx0ZXJUeXBlOiBGSUxURVJfVFlQRSwgX2ZyZXF1ZW5jeTogbnVtYmVyLCBfZ2FpbjogbnVtYmVyLCBfcXVhbGl0eTogbnVtYmVyKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuYXVkaW9GaWx0ZXIgPSBfYXVkaW9TZXR0aW5ncy5nZXRBdWRpb0NvbnRleHQoKS5jcmVhdGVCaXF1YWRGaWx0ZXIoKTtcclxuICAgICAgICAgICAgdGhpcy5zZXRGaWx0ZXJUeXBlKF9maWx0ZXJUeXBlKTtcclxuICAgICAgICAgICAgdGhpcy5zZXRGcmVxdWVuY3koX2F1ZGlvU2V0dGluZ3MsIF9mcmVxdWVuY3kpO1xyXG4gICAgICAgICAgICB0aGlzLnNldEdhaW4oX2F1ZGlvU2V0dGluZ3MsIF9nYWluKTtcclxuICAgICAgICAgICAgdGhpcy5zZXRRdWFsaXR5KF9xdWFsaXR5KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzZXRGaWx0ZXJUeXBlKF9maWx0ZXJUeXBlOiBGSUxURVJfVFlQRSk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmZpbHRlclR5cGUgPSBfZmlsdGVyVHlwZTtcclxuICAgICAgICAgICAgdGhpcy5hdWRpb0ZpbHRlci50eXBlID0gdGhpcy5maWx0ZXJUeXBlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldEZpbHRlclR5cGUoKTogRklMVEVSX1RZUEUge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5maWx0ZXJUeXBlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHNldEZyZXF1ZW5jeShfYXVkaW9TZXR0aW5nczogQXVkaW9TZXR0aW5ncywgX2ZyZXF1ZW5jeTogbnVtYmVyKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuYXVkaW9GaWx0ZXIuZnJlcXVlbmN5LnNldFZhbHVlQXRUaW1lKF9mcmVxdWVuY3ksIF9hdWRpb1NldHRpbmdzLmdldEF1ZGlvQ29udGV4dCgpLmN1cnJlbnRUaW1lKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRGcmVxdWVuY3koKTogbnVtYmVyIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYXVkaW9GaWx0ZXIuZnJlcXVlbmN5LnZhbHVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwdWJsaWMgc2V0R2FpbihfYXVkaW9TZXR0aW5nczogQXVkaW9TZXR0aW5ncywgX2dhaW46IG51bWJlcik6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmF1ZGlvRmlsdGVyLmZyZXF1ZW5jeS5zZXRWYWx1ZUF0VGltZShfZ2FpbiwgX2F1ZGlvU2V0dGluZ3MuZ2V0QXVkaW9Db250ZXh0KCkuY3VycmVudFRpbWUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldEdhaW4oKTogbnVtYmVyIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYXVkaW9GaWx0ZXIuZ2Fpbi52YWx1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcHVibGljIHNldFF1YWxpdHkoX3F1YWxpdHk6IG51bWJlcik6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmF1ZGlvRmlsdGVyLlEudmFsdWUgPSBfcXVhbGl0eTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRRdWFsaXR5KCk6IG51bWJlciB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmF1ZGlvRmlsdGVyLlEudmFsdWU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEZ1ZGdlQ29yZSB7XHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICogUGFubmluZyBNb2RlbCBUeXBlIGZvciAzRCBsb2NhbGlzYXRpb24gb2YgYSBbW0NvbXBvbmVudEF1ZGlvXV0uXHJcbiAgICAgKiBAcGFyYW0gSFJGVCBVc3VhbGx5IHVzZWQgZm9yIDNEIHdvcmxkIHNwYWNlLCB0aGlzIHdpbGwgYmUgdGhlIGRlZmF1bHQgc2V0dGluZ1xyXG4gICAgICovXHJcbiAgICB0eXBlIFBBTk5JTkdfTU9ERUxfVFlQRSA9IFwiZXF1YWxwb3dlclwiIHwgXCJIUlRGXCI7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBEaXN0YW5jZSBNb2RlbCBUeXBlIGZvciAzRCBsb2NhbGlzYXRpb24gb2YgYSBbW0NvbXBvbmVudEF1ZGlvXV0uXHJcbiAgICAgKiBAcGFyYW0gaW52ZXJzZSBVc3VhbGx5IHVzZWQgZm9yIHZvbHVtZSBkcm9wIG9mIHNvdW5kIGluIDNEIHdvcmxkIHNwYWNlXHJcbiAgICAgKi9cclxuICAgIHR5cGUgRElTVEFOQ0VfTU9ERUxfVFlQRSA9IFwibGluZWFyXCIgfCBcImludmVyc2VcIiB8IFwiZXhwb25lbnRpYWxcIjtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFtbQXVkaW9Mb2NhbGlzYXRpb25dXSBkZXNjcmliZXMgdGhlIEF1ZGlvIFBhbm5lciB1c2VkIGluIFtbQ29tcG9uZW50QXVkaW9dXSwgXHJcbiAgICAgKiB3aGljaCBjb250YWlucyBkYXRhIGZvciBQb3NpdGlvbiwgT3JpZW50YXRpb24gYW5kIG90aGVyIGRhdGEgbmVlZGVkIHRvIGxvY2FsaXplIHRoZSBBdWRpbyBpbiBhIDNEIHNwYWNlLlxyXG4gICAgICogQGF1dGhvcnMgVGhvbWFzIERvcm5lciwgSEZVLCAyMDE5XHJcbiAgICAgKi9cclxuICAgIGV4cG9ydCBjbGFzcyBBdWRpb0xvY2FsaXNhdGlvbiB7XHJcblxyXG4gICAgICAgIHB1YmxpYyBwYW5uZXJOb2RlOiBQYW5uZXJOb2RlO1xyXG5cclxuICAgICAgICBwcml2YXRlIHBhbm5pbmdNb2RlbDogUEFOTklOR19NT0RFTF9UWVBFO1xyXG4gICAgICAgIHByaXZhdGUgZGlzdGFuY2VNb2RlbDogRElTVEFOQ0VfTU9ERUxfVFlQRTtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSByZWZEaXN0YW5jZTogbnVtYmVyO1xyXG4gICAgICAgIHByaXZhdGUgbWF4RGlzdGFuY2U6IG51bWJlcjtcclxuICAgICAgICBwcml2YXRlIHJvbGxvZmZGYWN0b3I6IG51bWJlcjtcclxuICAgICAgICBwcml2YXRlIGNvbmVJbm5lckFuZ2xlOiBudW1iZXI7XHJcbiAgICAgICAgcHJpdmF0ZSBjb25lT3V0ZXJBbmdsZTogbnVtYmVyO1xyXG4gICAgICAgIHByaXZhdGUgY29uZU91dGVyR2FpbjogbnVtYmVyO1xyXG5cclxuICAgICAgICBwcml2YXRlIHBvc2l0aW9uOiBWZWN0b3IzO1xyXG4gICAgICAgIHByaXZhdGUgb3JpZW50YXRpb246IFZlY3RvcjM7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQ29uc3RydWN0b3IgZm9yIHRoZSBbW0F1ZGlvTG9jYWxpc2F0aW9uXV0gQ2xhc3NcclxuICAgICAgICAgKiBAcGFyYW0gX2F1ZGlvQ29udGV4dCBmcm9tIFtbQXVkaW9TZXR0aW5nc11dXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2F1ZGlvU2V0dGluZ3M6IEF1ZGlvU2V0dGluZ3MpIHtcclxuICAgICAgICAgICB0aGlzLnBhbm5lck5vZGUgPSBfYXVkaW9TZXR0aW5ncy5nZXRBdWRpb0NvbnRleHQoKS5jcmVhdGVQYW5uZXIoKTtcclxuICAgICAgICAgICB0aGlzLmluaXREZWZhdWx0VmFsdWVzKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgdXBkYXRlUG9zaXRpb25zKF9wb3NpdGlvbjogVmVjdG9yMywgX29yaWVudGF0aW9uOiBWZWN0b3IzKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0UGFubmVyUG9zaXRpb24oX3Bvc2l0aW9uKTtcclxuICAgICAgICAgICAgdGhpcy5zZXRQYW5uZXJPcmllbnRhdGlvbihfb3JpZW50YXRpb24pO1xyXG4gICAgICAgIH1cclxuICAgICAgICAgLyoqXHJcbiAgICAgICAgICogV2Ugd2lsbCBjYWxsIHNldFBhbm5lclBvc2l0aW9uIHdoZW5ldmVyIHRoZXJlIGlzIGEgbmVlZCB0byBjaGFuZ2UgUG9zaXRpb25zLlxyXG4gICAgICAgICAqIEFsbCB0aGUgcG9zaXRpb24gdmFsdWVzIHNob3VsZCBiZSBpZGVudGljYWwgdG8gdGhlIGN1cnJlbnQgUG9zaXRpb24gdGhpcyBpcyBhdHRhY2hlZCB0by5cclxuICAgICAgICAgKlxyXG4gICAgICAgICAqICAgICAgfCAgICAgXHJcbiAgICAgICAgICogICAgICBvLS0tXHJcbiAgICAgICAgICogICAgLyAgX19cclxuICAgICAgICAgKiAgICAgIHxffCBQb3NpdGlvblxyXG4gICAgICAgICAqIFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyBzZXRQYW5uZXJQb3NpdGlvbihfcG9zaXRpb246IFZlY3RvcjMpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5wb3NpdGlvbiA9IF9wb3NpdGlvbjtcclxuXHJcbiAgICAgICAgICAgIHRoaXMucGFubmVyTm9kZS5wb3NpdGlvblgudmFsdWUgPSB0aGlzLnBvc2l0aW9uLng7XHJcbiAgICAgICAgICAgIHRoaXMucGFubmVyTm9kZS5wb3NpdGlvblkudmFsdWUgPSAtdGhpcy5wb3NpdGlvbi56O1xyXG4gICAgICAgICAgICB0aGlzLnBhbm5lck5vZGUucG9zaXRpb25aLnZhbHVlID0gdGhpcy5wb3NpdGlvbi55O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldFBhbm5lclBvc2l0aW9uKCk6IFZlY3RvcjMge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wb3NpdGlvbjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFNldCBQb3NpdGlvbiBmb3Igb3JpZW50YXRpb24gdGFyZ2V0XHJcbiAgICAgICAgICogXHJcbiAgICAgICAgICogICAgICB8ICAgICBcclxuICAgICAgICAgKiAgICAgIG8tLS1cclxuICAgICAgICAgKiAgICAvICBfX1xyXG4gICAgICAgICAqICAgICAgfF98XHJcbiAgICAgICAgICogICAgICAgIFxcXHJcbiAgICAgICAgICogICAgICAgVGFyZ2V0XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIHNldFBhbm5lck9yaWVudGF0aW9uKF9vcmllbnRhdGlvbjogVmVjdG9yMyk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLm9yaWVudGF0aW9uID0gX29yaWVudGF0aW9uO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5wYW5uZXJOb2RlLm9yaWVudGF0aW9uWC52YWx1ZSA9IHRoaXMub3JpZW50YXRpb24ueDtcclxuICAgICAgICAgICAgdGhpcy5wYW5uZXJOb2RlLm9yaWVudGF0aW9uWS52YWx1ZSA9IC10aGlzLm9yaWVudGF0aW9uLno7XHJcbiAgICAgICAgICAgIHRoaXMucGFubmVyTm9kZS5vcmllbnRhdGlvbloudmFsdWUgPSB0aGlzLm9yaWVudGF0aW9uLnk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0UGFubmVyT3JpZW50YXRpb24oKTogVmVjdG9yMyB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm9yaWVudGF0aW9uO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHNldERpc3RhbmNlTW9kZWwoX2Rpc3RhbmNlTW9kZWxUeXBlOiBESVNUQU5DRV9NT0RFTF9UWVBFKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuZGlzdGFuY2VNb2RlbCA9IF9kaXN0YW5jZU1vZGVsVHlwZTtcclxuICAgICAgICAgICAgdGhpcy5wYW5uZXJOb2RlLmRpc3RhbmNlTW9kZWwgPSB0aGlzLmRpc3RhbmNlTW9kZWw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0RGlzdGFuY2VNb2RlbCgpOiBESVNUQU5DRV9NT0RFTF9UWVBFIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGlzdGFuY2VNb2RlbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzZXRQYW5uaW5nTW9kZWwoX3Bhbm5pbmdNb2RlbFR5cGU6IFBBTk5JTkdfTU9ERUxfVFlQRSk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLnBhbm5pbmdNb2RlbCA9IF9wYW5uaW5nTW9kZWxUeXBlO1xyXG4gICAgICAgICAgICB0aGlzLnBhbm5lck5vZGUucGFubmluZ01vZGVsID0gdGhpcy5wYW5uaW5nTW9kZWw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0UGFubmluZ01vZGVsKCk6IFBBTk5JTkdfTU9ERUxfVFlQRSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBhbm5pbmdNb2RlbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzZXRSZWZEaXN0YW5jZShfcmVmRGlzdGFuY2U6IG51bWJlcik6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLnJlZkRpc3RhbmNlID0gX3JlZkRpc3RhbmNlO1xyXG4gICAgICAgICAgICB0aGlzLnBhbm5lck5vZGUucmVmRGlzdGFuY2UgPSB0aGlzLnJlZkRpc3RhbmNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldFJlZkRpc3RhbmNlKCk6IG51bWJlciB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJlZkRpc3RhbmNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHNldE1heERpc3RhbmNlKF9tYXhEaXN0YW5jZTogbnVtYmVyKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMubWF4RGlzdGFuY2UgPSBfbWF4RGlzdGFuY2U7XHJcbiAgICAgICAgICAgIHRoaXMucGFubmVyTm9kZS5tYXhEaXN0YW5jZSA9IHRoaXMubWF4RGlzdGFuY2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0TWF4RGlzdGFuY2UoKTogbnVtYmVyIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubWF4RGlzdGFuY2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0Um9sbG9mZkZhY3Rvcihfcm9sbG9mZkZhY3RvcjogbnVtYmVyKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMucm9sbG9mZkZhY3RvciA9IF9yb2xsb2ZmRmFjdG9yO1xyXG4gICAgICAgICAgICB0aGlzLnBhbm5lck5vZGUucm9sbG9mZkZhY3RvciA9IHRoaXMucm9sbG9mZkZhY3RvcjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRSb2xsb2ZmRmFjdG9yKCk6IG51bWJlciB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJvbGxvZmZGYWN0b3I7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0Q29uZUlubmVyQW5nbGUoX2NvbmVJbm5lckFuZ2xlOiBudW1iZXIpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5jb25lSW5uZXJBbmdsZSA9IF9jb25lSW5uZXJBbmdsZTtcclxuICAgICAgICAgICAgdGhpcy5wYW5uZXJOb2RlLmNvbmVJbm5lckFuZ2xlID0gdGhpcy5jb25lSW5uZXJBbmdsZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRDb25lSW5uZXJBbmdsZSgpOiBudW1iZXIge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb25lSW5uZXJBbmdsZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzZXRDb25lT3V0ZXJBbmdsZShfY29uZU91dGVyQW5nbGU6IG51bWJlcik6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmNvbmVPdXRlckFuZ2xlID0gX2NvbmVPdXRlckFuZ2xlO1xyXG4gICAgICAgICAgICB0aGlzLnBhbm5lck5vZGUuY29uZU91dGVyQW5nbGUgPSB0aGlzLmNvbmVPdXRlckFuZ2xlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldENvbmVPdXRlckFuZ2xlKCk6IG51bWJlciB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbmVPdXRlckFuZ2xlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHNldENvbmVPdXRlckdhaW4oX2NvbmVPdXRlckdhaW46IG51bWJlcik6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmNvbmVPdXRlckdhaW4gPSBfY29uZU91dGVyR2FpbjtcclxuICAgICAgICAgICAgdGhpcy5wYW5uZXJOb2RlLmNvbmVPdXRlckdhaW4gPSB0aGlzLmNvbmVPdXRlckdhaW47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0Q29uZU91dGVyR2FpbigpOiBudW1iZXIge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb25lT3V0ZXJHYWluO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogU2hvdyBhbGwgU2V0dGluZ3MgaW5zaWRlIG9mIFtbQXVkaW9Mb2NhbGlzYXRpb25dXS5cclxuICAgICAgICAgKiBVc2UgZm9yIERlYnVnZ2luZyBwdXJwb3Nlcy5cclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgc2hvd0xvY2FsaXNhdGlvblNldHRpbmdzKCk6IHZvaWQge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVwiKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJTaG93IGFsbCBTZXR0aW5ncyBvZiBQYW5uZXJcIik7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXCIpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlBhbm5lciBQb3NpdGlvbjogWDogXCIgKyB0aGlzLnBhbm5lck5vZGUucG9zaXRpb25YLnZhbHVlICsgXCIgfCBZOiBcIiArIHRoaXMucGFubmVyTm9kZS5wb3NpdGlvblkudmFsdWUgKyBcIiB8IFo6IFwiICsgdGhpcy5wYW5uZXJOb2RlLnBvc2l0aW9uWi52YWx1ZSk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUGFubmVyIE9yaWVudGF0aW9uOiBYOiBcIiArIHRoaXMucGFubmVyTm9kZS5vcmllbnRhdGlvblgudmFsdWUgKyBcIiB8IFk6IFwiICsgdGhpcy5wYW5uZXJOb2RlLm9yaWVudGF0aW9uWS52YWx1ZSArIFwiIHwgWjogXCIgKyB0aGlzLnBhbm5lck5vZGUub3JpZW50YXRpb25aLnZhbHVlKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJEaXN0YW5jZSBNb2RlbCBUeXBlOiBcIiArIHRoaXMuZGlzdGFuY2VNb2RlbCk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUGFubmVyIE1vZGVsIFR5cGU6IFwiICsgdGhpcy5wYW5uaW5nTW9kZWwpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlJlZiBEaXN0YW5jZTogXCIgKyB0aGlzLnJlZkRpc3RhbmNlKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJNYXggRGlzdGFuY2U6IFwiICsgdGhpcy5tYXhEaXN0YW5jZSk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUm9sbG9mZiBGYWN0b3I6IFwiICsgdGhpcy5yb2xsb2ZmRmFjdG9yKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJDb25lIElubmVyIEFuZ2xlOiBcIiArIHRoaXMuY29uZUlubmVyQW5nbGUpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkNvbmUgT3V0ZXIgQW5nbGU6IFwiICsgdGhpcy5jb25lT3V0ZXJBbmdsZSk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ29uZSBPdXRlciBHYWluOiBcIiArIHRoaXMuY29uZU91dGVyR2Fpbik7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXCIpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBpbml0RGVmYXVsdFZhbHVlcygpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5zZXRQYW5uaW5nTW9kZWwoXCJIUlRGXCIpO1xyXG4gICAgICAgICAgICB0aGlzLnNldERpc3RhbmNlTW9kZWwoXCJpbnZlcnNlXCIpO1xyXG4gICAgICAgICAgICB0aGlzLnNldENvbmVJbm5lckFuZ2xlKDkwKTtcclxuICAgICAgICAgICAgdGhpcy5zZXRDb25lT3V0ZXJBbmdsZSgyNzApO1xyXG4gICAgICAgICAgICB0aGlzLnNldENvbmVPdXRlckdhaW4oMCk7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0UmVmRGlzdGFuY2UoMSk7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0TWF4RGlzdGFuY2UoNSk7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0Um9sbG9mZkZhY3RvcigxKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc2hvd0xvY2FsaXNhdGlvblNldHRpbmdzKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEZ1ZGdlQ29yZSB7XHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICogRW51bWVyYXRvciBmb3IgYWxsIHBvc3NpYmxlIE9zY2lsbGF0b3IgVHlwZXNcclxuICAgICAqL1xyXG4gICAgdHlwZSBPU0NJTExBVE9SX1RZUEUgPSBcInNpbmVcIiB8IFwic3F1YXJlXCIgfCBcInNhd3Rvb3RoXCIgfCBcInRyaWFuZ2xlXCIgfCBcImN1c3RvbVwiO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogSW50ZXJmYWNlIHRvIGNyZWF0ZSBDdXN0b20gT3NjaWxsYXRvciBUeXBlcy5cclxuICAgICAqIFN0YXJ0LS9FbmRwb2ludCBvZiBhIGN1c3R1bSBjdXJ2ZSBlLmcuIHNpbmUgY3VydmUuXHJcbiAgICAgKiBCb3RoIHBhcmFtZXRlcnMgbmVlZCB0byBiZSBpbmJldHdlZW4gLTEgYW5kIDEuXHJcbiAgICAgKiBAcGFyYW0gc3RhcnRwb2ludCBzdGFydHBvaW50IG9mIGEgY3VydmUgXHJcbiAgICAgKiBAcGFyYW0gZW5kcG9pbnQgRW5kcG9pbnQgb2YgYSBjdXJ2ZSBcclxuICAgICAqL1xyXG4gICAgaW50ZXJmYWNlIE9zY2lsbGF0b3JXYXZlIHtcclxuICAgICAgICBzdGFydHBvaW50OiBudW1iZXI7XHJcbiAgICAgICAgZW5kcG9pbnQ6IG51bWJlcjtcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICogQWRkIGFuIFtbQXVkaW9GaWx0ZXJdXSB0byBhbiBbW0F1ZGlvXV1cclxuICAgICAqIEBhdXRob3JzIFRob21hcyBEb3JuZXIsIEhGVSwgMjAxOVxyXG4gICAgICovXHJcbiAgICBleHBvcnQgY2xhc3MgQXVkaW9Pc2NpbGxhdG9yIHtcclxuXHJcbiAgICAgICAgcHVibGljIGF1ZGlvT3NjaWxsYXRvcjogT3NjaWxsYXRvck5vZGU7IFxyXG5cclxuICAgICAgICBwcml2YXRlIGZyZXF1ZW5jeTogbnVtYmVyO1xyXG4gICAgICAgIHByaXZhdGUgb3NjaWxsYXRvclR5cGU6IE9TQ0lMTEFUT1JfVFlQRTtcclxuICAgICAgICBwcml2YXRlIG9zY2lsbGF0b3JXYXZlOiBQZXJpb2RpY1dhdmU7XHJcblxyXG4gICAgICAgIHByaXZhdGUgbG9jYWxHYWluOiBHYWluTm9kZTtcclxuICAgICAgICBwcml2YXRlIGxvY2FsR2FpblZhbHVlOiBudW1iZXI7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9hdWRpb1NldHRpbmdzOiBBdWRpb1NldHRpbmdzLCBfb3NjaWxsYXRvclR5cGU/OiBPU0NJTExBVE9SX1RZUEUpIHtcclxuICAgICAgICAgICAgdGhpcy5hdWRpb09zY2lsbGF0b3IgPSBfYXVkaW9TZXR0aW5ncy5nZXRBdWRpb0NvbnRleHQoKS5jcmVhdGVPc2NpbGxhdG9yKCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9jYWxHYWluID0gX2F1ZGlvU2V0dGluZ3MuZ2V0QXVkaW9Db250ZXh0KCkuY3JlYXRlR2FpbigpO1xyXG4gICAgICAgICAgICB0aGlzLm9zY2lsbGF0b3JUeXBlID0gX29zY2lsbGF0b3JUeXBlO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5vc2NpbGxhdG9yVHlwZSAhPSBcImN1c3RvbVwiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmF1ZGlvT3NjaWxsYXRvci50eXBlID0gdGhpcy5vc2NpbGxhdG9yVHlwZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5vc2NpbGxhdG9yV2F2ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXVkaW9Pc2NpbGxhdG9yLnNldFBlcmlvZGljV2F2ZSh0aGlzLm9zY2lsbGF0b3JXYXZlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ3JlYXRlIGEgQ3VzdG9tIFBlcmlvZGljIFdhdmUgZmlyc3QgdG8gdXNlIEN1c3RvbSBUeXBlXCIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0T3NjaWxsYXRvclR5cGUoX29zY2lsbGF0b3JUeXBlOiBPU0NJTExBVE9SX1RZUEUpOiB2b2lkIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMub3NjaWxsYXRvclR5cGUgIT0gXCJjdXN0b21cIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hdWRpb09zY2lsbGF0b3IudHlwZSA9IHRoaXMub3NjaWxsYXRvclR5cGU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMub3NjaWxsYXRvcldhdmUpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmF1ZGlvT3NjaWxsYXRvci5zZXRQZXJpb2RpY1dhdmUodGhpcy5vc2NpbGxhdG9yV2F2ZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRPc2NpbGxhdG9yVHlwZSgpOiBPU0NJTExBVE9SX1RZUEUge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5vc2NpbGxhdG9yVHlwZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBjcmVhdGVQZXJpb2RpY1dhdmUoX2F1ZGlvU2V0dGluZ3M6IEF1ZGlvU2V0dGluZ3MsIF9yZWFsOiBPc2NpbGxhdG9yV2F2ZSwgX2ltYWc6IE9zY2lsbGF0b3JXYXZlKTogdm9pZCB7XHJcbiAgICAgICAgICAgIGxldCB3YXZlUmVhbDogRmxvYXQzMkFycmF5ID0gbmV3IEZsb2F0MzJBcnJheSgyKTtcclxuICAgICAgICAgICAgd2F2ZVJlYWxbMF0gPSBfcmVhbC5zdGFydHBvaW50O1xyXG4gICAgICAgICAgICB3YXZlUmVhbFsxXSA9IF9yZWFsLmVuZHBvaW50O1xyXG5cclxuICAgICAgICAgICAgbGV0IHdhdmVJbWFnOiBGbG9hdDMyQXJyYXkgPSBuZXcgRmxvYXQzMkFycmF5KDIpO1xyXG4gICAgICAgICAgICB3YXZlSW1hZ1swXSA9IF9pbWFnLnN0YXJ0cG9pbnQ7XHJcbiAgICAgICAgICAgIHdhdmVJbWFnWzFdID0gX2ltYWcuZW5kcG9pbnQ7XHJcblxyXG4gICAgICAgICAgICB0aGlzLm9zY2lsbGF0b3JXYXZlID0gX2F1ZGlvU2V0dGluZ3MuZ2V0QXVkaW9Db250ZXh0KCkuY3JlYXRlUGVyaW9kaWNXYXZlKHdhdmVSZWFsLCB3YXZlSW1hZyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0TG9jYWxHYWluKF9sb2NhbEdhaW46IEdhaW5Ob2RlKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMubG9jYWxHYWluID0gX2xvY2FsR2FpbjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRMb2NhbEdhaW4oKTogR2Fpbk5vZGUge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5sb2NhbEdhaW47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0TG9jYWxHYWluVmFsdWUoX2xvY2FsR2FpblZhbHVlOiBudW1iZXIpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5sb2NhbEdhaW5WYWx1ZSA9IF9sb2NhbEdhaW5WYWx1ZTtcclxuICAgICAgICAgICAgdGhpcy5sb2NhbEdhaW4uZ2Fpbi52YWx1ZSA9IHRoaXMubG9jYWxHYWluVmFsdWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0TG9jYWxHYWluVmFsdWUoKTogbnVtYmVyIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubG9jYWxHYWluVmFsdWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0RnJlcXVlbmN5KF9hdWRpb1NldHRpbmdzOiBBdWRpb1NldHRpbmdzLCBfZnJlcXVlbmN5OiBudW1iZXIpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5mcmVxdWVuY3kgPSBfZnJlcXVlbmN5O1xyXG4gICAgICAgICAgICB0aGlzLmF1ZGlvT3NjaWxsYXRvci5mcmVxdWVuY3kuc2V0VmFsdWVBdFRpbWUodGhpcy5mcmVxdWVuY3ksIF9hdWRpb1NldHRpbmdzLmdldEF1ZGlvQ29udGV4dCgpLmN1cnJlbnRUaW1lKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRGcmVxdWVuY3koKTogbnVtYmVyIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZnJlcXVlbmN5O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGNyZWF0ZVNuYXJlKF9hdWRpb1NldHRpbmdzOiBBdWRpb1NldHRpbmdzKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0T3NjaWxsYXRvclR5cGUoXCJ0cmlhbmdsZVwiKTtcclxuICAgICAgICAgICAgdGhpcy5zZXRGcmVxdWVuY3koX2F1ZGlvU2V0dGluZ3MsIDEwMCk7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0TG9jYWxHYWluVmFsdWUoMCk7XHJcbiAgICAgICAgICAgIHRoaXMubG9jYWxHYWluLmdhaW4uc2V0VmFsdWVBdFRpbWUoMCwgX2F1ZGlvU2V0dGluZ3MuZ2V0QXVkaW9Db250ZXh0KCkuY3VycmVudFRpbWUpO1xyXG4gICAgICAgICAgICB0aGlzLmxvY2FsR2Fpbi5nYWluLmV4cG9uZW50aWFsUmFtcFRvVmFsdWVBdFRpbWUoMC4wMSwgX2F1ZGlvU2V0dGluZ3MuZ2V0QXVkaW9Db250ZXh0KCkuY3VycmVudFRpbWUgKyAuMSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmF1ZGlvT3NjaWxsYXRvci5jb25uZWN0KHRoaXMubG9jYWxHYWluKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgRnVkZ2VDb3JlIHtcclxuICAgIC8qKlxyXG4gICAgICogSW50ZXJmYWNlIHRvIGdlbmVyYXRlIERhdGEgUGFpcnMgb2YgVVJMIGFuZCBBdWRpb0J1ZmZlclxyXG4gICAgICovXHJcbiAgICBpbnRlcmZhY2UgQXVkaW9EYXRhIHtcclxuICAgICAgICB1cmw6IHN0cmluZztcclxuICAgICAgICBidWZmZXI6IEF1ZGlvQnVmZmVyO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogRGVzY3JpYmVzIERhdGEgSGFuZGxlciBmb3IgYWxsIEF1ZGlvIFNvdXJjZXNcclxuICAgICAqIEBhdXRob3JzIFRob21hcyBEb3JuZXIsIEhGVSwgMjAxOVxyXG4gICAgICovXHJcbiAgICBleHBvcnQgY2xhc3MgQXVkaW9TZXNzaW9uRGF0YSB7XHJcblxyXG4gICAgICAgIHB1YmxpYyBkYXRhQXJyYXk6IEF1ZGlvRGF0YVtdO1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBDb25zdHJ1Y3RvciBvZiB0aGUgW1tBdWRpb1Nlc3Npb25EYXRhXV0gQ2xhc3MuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZGF0YUFycmF5ID0gbmV3IEFycmF5KCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBEZWNvZGluZyBBdWRpbyBEYXRhIFxyXG4gICAgICAgICAqIEFzeW5jaHJvbm91cyBGdW5jdGlvbiB0byBwZXJtaXQgdGhlIGxvYWRpbmcgb2YgbXVsdGlwbGUgRGF0YSBTb3VyY2VzIGF0IHRoZSBzYW1lIHRpbWVcclxuICAgICAgICAgKiBAcGFyYW0gX2F1ZGlvQ29udGV4dCBBdWRpb0NvbnRleHQgZnJvbSBBdWRpb1NldHRpbmdzXHJcbiAgICAgICAgICogQHBhcmFtIF91cmwgVVJMIGFzIFN0cmluZyBmb3IgRGF0YSBmZXRjaGluZ1xyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyBhc3luYyB1cmxUb0J1ZmZlcihfYXVkaW9Db250ZXh0OiBBdWRpb0NvbnRleHQsIF91cmw6IHN0cmluZyk6IFByb21pc2U8QXVkaW9CdWZmZXI+IHtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGxldCBpbml0T2JqZWN0OiBSZXF1ZXN0SW5pdCA9IHtcclxuICAgICAgICAgICAgICAgIG1ldGhvZDogXCJHRVRcIixcclxuICAgICAgICAgICAgICAgIG1vZGU6IFwic2FtZS1vcmlnaW5cIiwgLy9kZWZhdWx0IC0+IHNhbWUtb3JpZ2luXHJcbiAgICAgICAgICAgICAgICBjYWNoZTogXCJuby1jYWNoZVwiLCAvL2RlZmF1bHQgLT4gZGVmYXVsdCBcclxuICAgICAgICAgICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICAgICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImF1ZGlvL21wZWczXCJcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICByZWRpcmVjdDogXCJmb2xsb3dcIiAvLyBkZWZhdWx0IC0+IGZvbGxvd1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgbGV0IGJ1ZmZlcjogQXVkaW9CdWZmZXIgPSBudWxsO1xyXG4gICAgICAgICAgICBmb3IgKGxldCB4OiBudW1iZXIgPSAwOyB4IDwgdGhpcy5kYXRhQXJyYXkubGVuZ3RoOyB4KyspIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmRhdGFBcnJheVt4XS51cmwgPT0gX3VybCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRXhpc3RpbmcgVVJMIGZvdW5kXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmRhdGFBcnJheVt4XS5idWZmZXIgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXNwb25zZTogUmVzcG9uc2UgPSBhd2FpdCB3aW5kb3cuZmV0Y2goX3VybCwgaW5pdE9iamVjdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGFycmF5QnVmZmVyOiBBcnJheUJ1ZmZlciA9IGF3YWl0IHJlc3BvbnNlLmFycmF5QnVmZmVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRlY29kZWRBdWRpbzogQXVkaW9CdWZmZXIgPSBhd2FpdCBfYXVkaW9Db250ZXh0LmRlY29kZUF1ZGlvRGF0YShhcnJheUJ1ZmZlcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaEJ1ZmZlckluQXJyYXkoX3VybCwgZGVjb2RlZEF1ZGlvKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRlY29kZWRBdWRpbztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1ZmZlciA9IGF3YWl0IHRoaXMuZGF0YUFycmF5W3hdLmJ1ZmZlcjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGF0YUFycmF5W3hdLmJ1ZmZlcjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGJ1ZmZlciA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaFVybEluQXJyYXkoX3VybCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzcG9uc2U6IFJlc3BvbnNlID0gYXdhaXQgd2luZG93LmZldGNoKF91cmwsIGluaXRPYmplY3QpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFycmF5QnVmZmVyOiBBcnJheUJ1ZmZlciA9IGF3YWl0IHJlc3BvbnNlLmFycmF5QnVmZmVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVjb2RlZEF1ZGlvOiBBdWRpb0J1ZmZlciA9IGF3YWl0IF9hdWRpb0NvbnRleHQuZGVjb2RlQXVkaW9EYXRhKGFycmF5QnVmZmVyKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hCdWZmZXJJbkFycmF5KF91cmwsIGRlY29kZWRBdWRpbyk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRlY29kZWRBdWRpbztcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxvZ0Vycm9yRmV0Y2goZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gXHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBQdXNoIFVSTCBpbnRvIERhdGEgQXJyYXkgdG8gY3JlYXRlIGEgUGxhY2Vob2xkZXIgaW4gd2hpY2ggdGhlIEJ1ZmZlciBjYW4gYmUgcGxhY2VkIGF0IGEgbGF0ZXIgdGltZVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFxyXG4gICAgICAgICAqIEBwYXJhbSBfdXJsIFxyXG4gICAgICAgICAqIEBwYXJhbSBfYXVkaW9CdWZmZXIgXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIHB1c2hCdWZmZXJJbkFycmF5KF91cmw6IHN0cmluZywgX2F1ZGlvQnVmZmVyOiBBdWRpb0J1ZmZlcik6IHZvaWQge1xyXG4gICAgICAgICAgICBmb3IgKGxldCB4OiBudW1iZXIgPSAwOyB4IDwgdGhpcy5kYXRhQXJyYXkubGVuZ3RoOyB4KyspIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmRhdGFBcnJheVt4XS51cmwgPT0gX3VybCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmRhdGFBcnJheVt4XS5idWZmZXIgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRhdGFBcnJheVt4XS5idWZmZXIgPSBfYXVkaW9CdWZmZXI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gXHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIENyZWF0ZSBhIG5ldyBsb2cgZm9yIHRoZSBEYXRhIEFycmF5LlxyXG4gICAgICAgICAqIFVzZXMgYSB1cmwgYW5kIGNyZWF0ZXMgYSBwbGFjZWhvbGRlciBmb3IgdGhlIEF1ZGlvQnVmZmVyLlxyXG4gICAgICAgICAqIFRoZSBBdWRpb0J1ZmZlciBnZXRzIGFkZGVkIGFzIHNvb24gYXMgaXQgaXMgY3JlYXRlZC5cclxuICAgICAgICAgKiBAcGFyYW0gX3VybCBBZGQgYSB1cmwgdG8gYSB3YW50ZWQgcmVzb3VyY2UgYXMgYSBzdHJpbmdcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgcHVzaFVybEluQXJyYXkoX3VybDogc3RyaW5nKTogdm9pZCB7XHJcbiAgICAgICAgICAgIGxldCBkYXRhOiBBdWRpb0RhdGE7XHJcbiAgICAgICAgICAgIGRhdGEgPSB7XHJcbiAgICAgICAgICAgICAgICB1cmw6IF91cmwsXHJcbiAgICAgICAgICAgICAgICBidWZmZXI6IG51bGxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgdGhpcy5kYXRhQXJyYXkucHVzaChkYXRhKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFNob3cgYWxsIERhdGEgaW4gQXJyYXkuXHJcbiAgICAgICAgICogVXNlIHRoaXMgZm9yIERlYnVnZ2luZyBwdXJwb3Nlcy5cclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgc2hvd0RhdGFJbkFycmF5KCk6IHZvaWQge1xyXG4gICAgICAgICAgICBmb3IgKGxldCB4OiBudW1iZXIgPSAwOyB4IDwgdGhpcy5kYXRhQXJyYXkubGVuZ3RoOyB4KyspIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQXJyYXkgRGF0YTogXCIgKyB0aGlzLmRhdGFBcnJheVt4XS51cmwgKyB0aGlzLmRhdGFBcnJheVt4XS5idWZmZXIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBFcnJvciBNZXNzYWdlIGZvciBEYXRhIEZldGNoaW5nXHJcbiAgICAgICAgICogQHBhcmFtIGUgRXJyb3JcclxuICAgICAgICAgKi9cclxuICAgICAgICBwcml2YXRlIGxvZ0Vycm9yRmV0Y2goX2Vycm9yOiBFcnJvcik6IHZvaWQge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkF1ZGlvIGVycm9yXCIsIF9lcnJvcik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEZ1ZGdlQ29yZSB7XHJcbiAgICAvKipcclxuICAgICAqIERlc2NyaWJlcyBHbG9iYWwgQXVkaW8gU2V0dGluZ3MuXHJcbiAgICAgKiBJcyBtZWFudCB0byBiZSB1c2VkIGFzIGEgTWVudSBvcHRpb24uXHJcbiAgICAgKiBAYXV0aG9ycyBUaG9tYXMgRG9ybmVyLCBIRlUsIDIwMTlcclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGNsYXNzIEF1ZGlvU2V0dGluZ3Mge1xyXG4gICAgICAgIFxyXG4gICAgICAgIHB1YmxpYyBtYXN0ZXJHYWluOiBHYWluTm9kZTtcclxuICAgICAgICBwcml2YXRlIG1hc3RlckdhaW5WYWx1ZTogbnVtYmVyO1xyXG5cclxuICAgICAgICBwcml2YXRlIGdsb2JhbEF1ZGlvQ29udGV4dDogQXVkaW9Db250ZXh0O1xyXG4gICAgICAgIHByaXZhdGUgYXVkaW9TZXNzaW9uRGF0YTogQXVkaW9TZXNzaW9uRGF0YTtcclxuICAgICAgICAvL1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIENvbnN0cnVjdG9yIGZvciB0aGUgW1tBdWRpb1NldHRpbmdzXV0gQ2xhc3MuXHJcbiAgICAgICAgICogTWFpbiBjbGFzcyBmb3IgYWxsIEF1ZGlvIENsYXNzZXMuXHJcbiAgICAgICAgICogTmVlZCB0byBjcmVhdGUgdGhpcyBmaXJzdCwgd2hlbiB3b3JraW5nIHdpdGggc291bmRzLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgICAgICB0aGlzLnNldEF1ZGlvQ29udGV4dChuZXcgQXVkaW9Db250ZXh0KHsgbGF0ZW5jeUhpbnQ6IFwiaW50ZXJhY3RpdmVcIiwgc2FtcGxlUmF0ZTogNDQxMDAgfSkpO1xyXG4gICAgICAgICAgICAvL3RoaXMuZ2xvYmFsQXVkaW9Db250ZXh0LnJlc3VtZSgpO1xyXG4gICAgICAgICAgICB0aGlzLm1hc3RlckdhaW4gPSB0aGlzLmdsb2JhbEF1ZGlvQ29udGV4dC5jcmVhdGVHYWluKCk7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0TWFzdGVyR2FpblZhbHVlKDEpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5zZXRBdWRpb1Nlc3Npb24obmV3IEF1ZGlvU2Vzc2lvbkRhdGEoKSk7XHJcbiAgICAgICAgICAgIHRoaXMubWFzdGVyR2Fpbi5jb25uZWN0KHRoaXMuZ2xvYmFsQXVkaW9Db250ZXh0LmRlc3RpbmF0aW9uKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzZXRNYXN0ZXJHYWluVmFsdWUoX21hc3RlckdhaW5WYWx1ZTogbnVtYmVyKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMubWFzdGVyR2FpblZhbHVlID0gX21hc3RlckdhaW5WYWx1ZTtcclxuICAgICAgICAgICAgdGhpcy5tYXN0ZXJHYWluLmdhaW4udmFsdWUgPSB0aGlzLm1hc3RlckdhaW5WYWx1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRNYXN0ZXJHYWluVmFsdWUoKTogbnVtYmVyIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubWFzdGVyR2FpblZhbHVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldEF1ZGlvQ29udGV4dCgpOiBBdWRpb0NvbnRleHQge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nbG9iYWxBdWRpb0NvbnRleHQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0QXVkaW9Db250ZXh0KF9hdWRpb0NvbnRleHQ6IEF1ZGlvQ29udGV4dCk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmdsb2JhbEF1ZGlvQ29udGV4dCA9IF9hdWRpb0NvbnRleHQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0QXVkaW9TZXNzaW9uKCk6IEF1ZGlvU2Vzc2lvbkRhdGEge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hdWRpb1Nlc3Npb25EYXRhO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHNldEF1ZGlvU2Vzc2lvbihfYXVkaW9TZXNzaW9uOiBBdWRpb1Nlc3Npb25EYXRhKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuYXVkaW9TZXNzaW9uRGF0YSA9IF9hdWRpb1Nlc3Npb247XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBQYXVzZXMgdGhlIHByb2dyZXNzaW9uIG9mIHRpbWUgb2YgdGhlIEF1ZGlvQ29udGV4dC5cclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgc3VzcGVuZEF1ZGlvQ29udGV4dCgpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5nbG9iYWxBdWRpb0NvbnRleHQuc3VzcGVuZCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogUmVzdW1lcyB0aGUgcHJvZ3Jlc3Npb24gb2YgdGltZSBvZiB0aGUgQXVkaW9Db250ZXh0IGFmdGVyIHBhdXNpbmcgaXQuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIHJlc3VtZUF1ZGlvQ29udGV4dCgpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5nbG9iYWxBdWRpb0NvbnRleHQucmVzdW1lKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwiLy88cmVmZXJlbmNlIHBhdGg9XCIuLi9Db2F0cy9Db2F0LnRzXCIvPlxubmFtZXNwYWNlIEZ1ZGdlQ29yZSB7XG4gICAgdHlwZSBDb2F0SW5qZWN0aW9uID0gKHRoaXM6IENvYXQsIF9yZW5kZXJTaGFkZXI6IFJlbmRlclNoYWRlcikgPT4gdm9pZDtcbiAgICBleHBvcnQgY2xhc3MgUmVuZGVySW5qZWN0b3Ige1xuICAgICAgICBwcml2YXRlIHN0YXRpYyBjb2F0SW5qZWN0aW9uczogeyBbY2xhc3NOYW1lOiBzdHJpbmddOiBDb2F0SW5qZWN0aW9uIH0gPSB7XG4gICAgICAgICAgICBcIkNvYXRDb2xvcmVkXCI6IFJlbmRlckluamVjdG9yLmluamVjdFJlbmRlckRhdGFGb3JDb2F0Q29sb3JlZCxcbiAgICAgICAgICAgIFwiQ29hdFRleHR1cmVkXCI6IFJlbmRlckluamVjdG9yLmluamVjdFJlbmRlckRhdGFGb3JDb2F0VGV4dHVyZWQsXG4gICAgICAgICAgICBcIkNvYXRNYXRDYXBcIjogUmVuZGVySW5qZWN0b3IuaW5qZWN0UmVuZGVyRGF0YUZvckNvYXRNYXRDYXBcbiAgICAgICAgfTtcblxuICAgICAgICBwdWJsaWMgc3RhdGljIGRlY29yYXRlQ29hdChfY29uc3RydWN0b3I6IEZ1bmN0aW9uKTogdm9pZCB7XG4gICAgICAgICAgICBsZXQgY29hdEluamVjdGlvbjogQ29hdEluamVjdGlvbiA9IFJlbmRlckluamVjdG9yLmNvYXRJbmplY3Rpb25zW19jb25zdHJ1Y3Rvci5uYW1lXTtcbiAgICAgICAgICAgIGlmICghY29hdEluamVjdGlvbikge1xuICAgICAgICAgICAgICAgIERlYnVnLmVycm9yKFwiTm8gaW5qZWN0aW9uIGRlY29yYXRvciBkZWZpbmVkIGZvciBcIiArIF9jb25zdHJ1Y3Rvci5uYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShfY29uc3RydWN0b3IucHJvdG90eXBlLCBcInVzZVJlbmRlckRhdGFcIiwge1xuICAgICAgICAgICAgICAgIHZhbHVlOiBjb2F0SW5qZWN0aW9uXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHByaXZhdGUgc3RhdGljIGluamVjdFJlbmRlckRhdGFGb3JDb2F0Q29sb3JlZCh0aGlzOiBDb2F0LCBfcmVuZGVyU2hhZGVyOiBSZW5kZXJTaGFkZXIpOiB2b2lkIHtcbiAgICAgICAgICAgIGxldCBjb2xvclVuaWZvcm1Mb2NhdGlvbjogV2ViR0xVbmlmb3JtTG9jYXRpb24gPSBfcmVuZGVyU2hhZGVyLnVuaWZvcm1zW1widV9jb2xvclwiXTtcbiAgICAgICAgICAgIC8vIGxldCB7IHIsIGcsIGIsIGEgfSA9ICg8Q29hdENvbG9yZWQ+dGhpcykuY29sb3I7XG4gICAgICAgICAgICAvLyBsZXQgY29sb3I6IEZsb2F0MzJBcnJheSA9IG5ldyBGbG9hdDMyQXJyYXkoW3IsIGcsIGIsIGFdKTtcbiAgICAgICAgICAgIGxldCBjb2xvcjogRmxvYXQzMkFycmF5ID0gKDxDb2F0Q29sb3JlZD50aGlzKS5jb2xvci5nZXRBcnJheSgpO1xuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuZ2V0UmVuZGVyaW5nQ29udGV4dCgpLnVuaWZvcm00ZnYoY29sb3JVbmlmb3JtTG9jYXRpb24sIGNvbG9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHByaXZhdGUgc3RhdGljIGluamVjdFJlbmRlckRhdGFGb3JDb2F0VGV4dHVyZWQodGhpczogQ29hdCwgX3JlbmRlclNoYWRlcjogUmVuZGVyU2hhZGVyKTogdm9pZCB7XG4gICAgICAgICAgICBsZXQgY3JjMzogV2ViR0wyUmVuZGVyaW5nQ29udGV4dCA9IFJlbmRlck9wZXJhdG9yLmdldFJlbmRlcmluZ0NvbnRleHQoKTtcbiAgICAgICAgICAgIGlmICh0aGlzLnJlbmRlckRhdGEpIHtcbiAgICAgICAgICAgICAgICAvLyBidWZmZXJzIGV4aXN0XG4gICAgICAgICAgICAgICAgY3JjMy5hY3RpdmVUZXh0dXJlKFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuVEVYVFVSRTApO1xuICAgICAgICAgICAgICAgIGNyYzMuYmluZFRleHR1cmUoV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5URVhUVVJFXzJELCB0aGlzLnJlbmRlckRhdGFbXCJ0ZXh0dXJlMFwiXSk7XG4gICAgICAgICAgICAgICAgY3JjMy51bmlmb3JtMWkoX3JlbmRlclNoYWRlci51bmlmb3Jtc1tcInVfdGV4dHVyZVwiXSwgMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlbmRlckRhdGEgPSB7fTtcbiAgICAgICAgICAgICAgICAvLyBUT0RPOiBjaGVjayBpZiBhbGwgV2ViR0wtQ3JlYXRpb25zIGFyZSBhc3NlcnRlZFxuICAgICAgICAgICAgICAgIGNvbnN0IHRleHR1cmU6IFdlYkdMVGV4dHVyZSA9IFJlbmRlck1hbmFnZXIuYXNzZXJ0PFdlYkdMVGV4dHVyZT4oY3JjMy5jcmVhdGVUZXh0dXJlKCkpO1xuICAgICAgICAgICAgICAgIGNyYzMuYmluZFRleHR1cmUoV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5URVhUVVJFXzJELCB0ZXh0dXJlKTtcblxuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNyYzMudGV4SW1hZ2UyRChjcmMzLlRFWFRVUkVfMkQsIDAsIGNyYzMuUkdCQSwgY3JjMy5SR0JBLCBjcmMzLlVOU0lHTkVEX0JZVEUsICg8Q29hdFRleHR1cmVkPnRoaXMpLnRleHR1cmUuaW1hZ2UpO1xuICAgICAgICAgICAgICAgICAgICBjcmMzLnRleEltYWdlMkQoXG4gICAgICAgICAgICAgICAgICAgICAgICBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LlRFWFRVUkVfMkQsIDAsIFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuUkdCQSwgV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5SR0JBLCBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LlVOU0lHTkVEX0JZVEUsXG4gICAgICAgICAgICAgICAgICAgICAgICAoPENvYXRUZXh0dXJlZD50aGlzKS50ZXh0dXJlLmltYWdlXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoX2UpIHtcbiAgICAgICAgICAgICAgICAgICAgRGVidWcuZXJyb3IoX2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjcmMzLnRleFBhcmFtZXRlcmkoV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5URVhUVVJFXzJELCBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LlRFWFRVUkVfTUFHX0ZJTFRFUiwgV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5ORUFSRVNUKTtcbiAgICAgICAgICAgICAgICBjcmMzLnRleFBhcmFtZXRlcmkoV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5URVhUVVJFXzJELCBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LlRFWFRVUkVfTUlOX0ZJTFRFUiwgV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5ORUFSRVNUKTtcbiAgICAgICAgICAgICAgICBjcmMzLmdlbmVyYXRlTWlwbWFwKGNyYzMuVEVYVFVSRV8yRCk7XG4gICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJEYXRhW1widGV4dHVyZTBcIl0gPSB0ZXh0dXJlO1xuXG4gICAgICAgICAgICAgICAgY3JjMy5iaW5kVGV4dHVyZShXZWJHTDJSZW5kZXJpbmdDb250ZXh0LlRFWFRVUkVfMkQsIG51bGwpO1xuICAgICAgICAgICAgICAgIHRoaXMudXNlUmVuZGVyRGF0YShfcmVuZGVyU2hhZGVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHByaXZhdGUgc3RhdGljIGluamVjdFJlbmRlckRhdGFGb3JDb2F0TWF0Q2FwKHRoaXM6IENvYXQsIF9yZW5kZXJTaGFkZXI6IFJlbmRlclNoYWRlcik6IHZvaWQge1xuICAgICAgICAgICAgbGV0IGNyYzM6IFdlYkdMMlJlbmRlcmluZ0NvbnRleHQgPSBSZW5kZXJPcGVyYXRvci5nZXRSZW5kZXJpbmdDb250ZXh0KCk7XG5cbiAgICAgICAgICAgIGxldCBjb2xvclVuaWZvcm1Mb2NhdGlvbjogV2ViR0xVbmlmb3JtTG9jYXRpb24gPSBfcmVuZGVyU2hhZGVyLnVuaWZvcm1zW1widV90aW50X2NvbG9yXCJdO1xuICAgICAgICAgICAgbGV0IHsgciwgZywgYiwgYSB9ID0gKDxDb2F0TWF0Q2FwPnRoaXMpLnRpbnRDb2xvcjtcbiAgICAgICAgICAgIGxldCB0aW50Q29sb3JBcnJheTogRmxvYXQzMkFycmF5ID0gbmV3IEZsb2F0MzJBcnJheShbciwgZywgYiwgYV0pO1xuICAgICAgICAgICAgY3JjMy51bmlmb3JtNGZ2KGNvbG9yVW5pZm9ybUxvY2F0aW9uLCB0aW50Q29sb3JBcnJheSk7XG5cbiAgICAgICAgICAgIGxldCBmbG9hdFVuaWZvcm1Mb2NhdGlvbjogV2ViR0xVbmlmb3JtTG9jYXRpb24gPSBfcmVuZGVyU2hhZGVyLnVuaWZvcm1zW1widV9mbGF0bWl4XCJdO1xuICAgICAgICAgICAgbGV0IGZsYXRNaXg6IG51bWJlciA9ICg8Q29hdE1hdENhcD50aGlzKS5mbGF0TWl4O1xuICAgICAgICAgICAgY3JjMy51bmlmb3JtMWYoZmxvYXRVbmlmb3JtTG9jYXRpb24sIGZsYXRNaXgpO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5yZW5kZXJEYXRhKSB7XG4gICAgICAgICAgICAgICAgLy8gYnVmZmVycyBleGlzdFxuICAgICAgICAgICAgICAgIGNyYzMuYWN0aXZlVGV4dHVyZShXZWJHTDJSZW5kZXJpbmdDb250ZXh0LlRFWFRVUkUwKTtcbiAgICAgICAgICAgICAgICBjcmMzLmJpbmRUZXh0dXJlKFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuVEVYVFVSRV8yRCwgdGhpcy5yZW5kZXJEYXRhW1widGV4dHVyZTBcIl0pO1xuICAgICAgICAgICAgICAgIGNyYzMudW5pZm9ybTFpKF9yZW5kZXJTaGFkZXIudW5pZm9ybXNbXCJ1X3RleHR1cmVcIl0sIDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJEYXRhID0ge307XG4gICAgICAgICAgICAgICAgLy8gVE9ETzogY2hlY2sgaWYgYWxsIFdlYkdMLUNyZWF0aW9ucyBhcmUgYXNzZXJ0ZWRcbiAgICAgICAgICAgICAgICBjb25zdCB0ZXh0dXJlOiBXZWJHTFRleHR1cmUgPSBSZW5kZXJNYW5hZ2VyLmFzc2VydDxXZWJHTFRleHR1cmU+KGNyYzMuY3JlYXRlVGV4dHVyZSgpKTtcbiAgICAgICAgICAgICAgICBjcmMzLmJpbmRUZXh0dXJlKFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuVEVYVFVSRV8yRCwgdGV4dHVyZSk7XG5cbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBjcmMzLnRleEltYWdlMkQoY3JjMy5URVhUVVJFXzJELCAwLCBjcmMzLlJHQkEsIGNyYzMuUkdCQSwgY3JjMy5VTlNJR05FRF9CWVRFLCAoPENvYXRNYXRDYXA+dGhpcykudGV4dHVyZS5pbWFnZSk7XG4gICAgICAgICAgICAgICAgICAgIGNyYzMudGV4SW1hZ2UyRChcbiAgICAgICAgICAgICAgICAgICAgICAgIFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuVEVYVFVSRV8yRCwgMCwgV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5SR0JBLCBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LlJHQkEsIFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuVU5TSUdORURfQllURSxcbiAgICAgICAgICAgICAgICAgICAgICAgICg8Q29hdE1hdENhcD50aGlzKS50ZXh0dXJlLmltYWdlXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoX2UpIHtcbiAgICAgICAgICAgICAgICAgICAgRGVidWcuZXJyb3IoX2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjcmMzLnRleFBhcmFtZXRlcmkoV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5URVhUVVJFXzJELCBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LlRFWFRVUkVfTUFHX0ZJTFRFUiwgV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5ORUFSRVNUKTtcbiAgICAgICAgICAgICAgICBjcmMzLnRleFBhcmFtZXRlcmkoV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5URVhUVVJFXzJELCBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LlRFWFRVUkVfTUlOX0ZJTFRFUiwgV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5ORUFSRVNUKTtcbiAgICAgICAgICAgICAgICBjcmMzLmdlbmVyYXRlTWlwbWFwKGNyYzMuVEVYVFVSRV8yRCk7XG4gICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJEYXRhW1widGV4dHVyZTBcIl0gPSB0ZXh0dXJlO1xuXG4gICAgICAgICAgICAgICAgY3JjMy5iaW5kVGV4dHVyZShXZWJHTDJSZW5kZXJpbmdDb250ZXh0LlRFWFRVUkVfMkQsIG51bGwpO1xuICAgICAgICAgICAgICAgIHRoaXMudXNlUmVuZGVyRGF0YShfcmVuZGVyU2hhZGVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn0iLCJuYW1lc3BhY2UgRnVkZ2VDb3JlIHtcbiAgICBleHBvcnQgaW50ZXJmYWNlIEJ1ZmZlclNwZWNpZmljYXRpb24ge1xuICAgICAgICBzaXplOiBudW1iZXI7ICAgLy8gVGhlIHNpemUgb2YgdGhlIGRhdGFzYW1wbGUuXG4gICAgICAgIGRhdGFUeXBlOiBudW1iZXI7IC8vIFRoZSBkYXRhdHlwZSBvZiB0aGUgc2FtcGxlIChlLmcuIGdsLkZMT0FULCBnbC5CWVRFLCBldGMuKVxuICAgICAgICBub3JtYWxpemU6IGJvb2xlYW47IC8vIEZsYWcgdG8gbm9ybWFsaXplIHRoZSBkYXRhLlxuICAgICAgICBzdHJpZGU6IG51bWJlcjsgLy8gTnVtYmVyIG9mIGluZGljZXMgdGhhdCB3aWxsIGJlIHNraXBwZWQgZWFjaCBpdGVyYXRpb24uXG4gICAgICAgIG9mZnNldDogbnVtYmVyOyAvLyBJbmRleCBvZiB0aGUgZWxlbWVudCB0byBiZWdpbiB3aXRoLlxuICAgIH1cbiAgICBleHBvcnQgaW50ZXJmYWNlIFJlbmRlclNoYWRlciB7XG4gICAgICAgIC8vIFRPRE86IGV4YW1pbmUsIGlmIHRoaXMgc2hvdWxkIGJlIGluamVjdGVkIGluIHNoYWRlciBjbGFzcyB2aWEgUmVuZGVySW5qZWN0b3IsIGFzIGRvbmUgd2l0aCBDb2F0XG4gICAgICAgIHByb2dyYW06IFdlYkdMUHJvZ3JhbTtcbiAgICAgICAgYXR0cmlidXRlczogeyBbbmFtZTogc3RyaW5nXTogbnVtYmVyIH07XG4gICAgICAgIHVuaWZvcm1zOiB7IFtuYW1lOiBzdHJpbmddOiBXZWJHTFVuaWZvcm1Mb2NhdGlvbiB9O1xuICAgIH1cblxuICAgIGV4cG9ydCBpbnRlcmZhY2UgUmVuZGVyQnVmZmVycyB7XG4gICAgICAgIC8vIFRPRE86IGV4YW1pbmUsIGlmIHRoaXMgc2hvdWxkIGJlIGluamVjdGVkIGluIG1lc2ggY2xhc3MgdmlhIFJlbmRlckluamVjdG9yLCBhcyBkb25lIHdpdGggQ29hdFxuICAgICAgICB2ZXJ0aWNlczogV2ViR0xCdWZmZXI7XG4gICAgICAgIGluZGljZXM6IFdlYkdMQnVmZmVyO1xuICAgICAgICBuSW5kaWNlczogbnVtYmVyO1xuICAgICAgICB0ZXh0dXJlVVZzOiBXZWJHTEJ1ZmZlcjtcbiAgICAgICAgbm9ybWFsc0ZhY2U6IFdlYkdMQnVmZmVyO1xuICAgIH1cblxuICAgIGV4cG9ydCBpbnRlcmZhY2UgUmVuZGVyQ29hdCB7XG4gICAgICAgIC8vVE9ETzogZXhhbWluZSwgaWYgaXQgbWFrZXMgc2Vuc2UgdG8gc3RvcmUgYSB2YW8gZm9yIGVhY2ggQ29hdCwgZXZlbiB0aG91Z2ggZS5nLiBjb2xvciB3b24ndCBiZSBzdG9yZWQgYW55d2F5Li4uXG4gICAgICAgIC8vdmFvOiBXZWJHTFZlcnRleEFycmF5T2JqZWN0O1xuICAgICAgICBjb2F0OiBDb2F0O1xuICAgIH1cblxuICAgIGV4cG9ydCBpbnRlcmZhY2UgUmVuZGVyTGlnaHRzIHtcbiAgICAgICAgW3R5cGU6IHN0cmluZ106IEZsb2F0MzJBcnJheTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBCYXNlIGNsYXNzIGZvciBSZW5kZXJNYW5hZ2VyLCBoYW5kbGluZyB0aGUgY29ubmVjdGlvbiB0byB0aGUgcmVuZGVyaW5nIHN5c3RlbSwgaW4gdGhpcyBjYXNlIFdlYkdMLlxuICAgICAqIE1ldGhvZHMgYW5kIGF0dHJpYnV0ZXMgb2YgdGhpcyBjbGFzcyBzaG91bGQgbm90IGJlIGNhbGxlZCBkaXJlY3RseSwgb25seSB0aHJvdWdoIFtbUmVuZGVyTWFuYWdlcl1dXG4gICAgICovXG4gICAgZXhwb3J0IGFic3RyYWN0IGNsYXNzIFJlbmRlck9wZXJhdG9yIHtcbiAgICAgICAgcHJvdGVjdGVkIHN0YXRpYyBjcmMzOiBXZWJHTDJSZW5kZXJpbmdDb250ZXh0O1xuICAgICAgICBwcml2YXRlIHN0YXRpYyByZWN0Vmlld3BvcnQ6IFJlY3RhbmdsZTtcbiAgICAgICAgcHJpdmF0ZSBzdGF0aWMgcmVuZGVyU2hhZGVyUmF5Q2FzdDogUmVuZGVyU2hhZGVyO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAqIENoZWNrcyB0aGUgZmlyc3QgcGFyYW1ldGVyIGFuZCB0aHJvd3MgYW4gZXhjZXB0aW9uIHdpdGggdGhlIFdlYkdMLWVycm9yY29kZSBpZiB0aGUgdmFsdWUgaXMgbnVsbFxuICAgICAgICAqIEBwYXJhbSBfdmFsdWUgLy8gdmFsdWUgdG8gY2hlY2sgYWdhaW5zdCBudWxsXG4gICAgICAgICogQHBhcmFtIF9tZXNzYWdlIC8vIG9wdGlvbmFsLCBhZGRpdGlvbmFsIG1lc3NhZ2UgZm9yIHRoZSBleGNlcHRpb25cbiAgICAgICAgKi9cbiAgICAgICAgcHVibGljIHN0YXRpYyBhc3NlcnQ8VD4oX3ZhbHVlOiBUIHwgbnVsbCwgX21lc3NhZ2U6IHN0cmluZyA9IFwiXCIpOiBUIHtcbiAgICAgICAgICAgIGlmIChfdmFsdWUgPT09IG51bGwpXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBBc3NlcnRpb24gZmFpbGVkLiAke19tZXNzYWdlfSwgV2ViR0wtRXJyb3I6ICR7UmVuZGVyT3BlcmF0b3IuY3JjMyA/IFJlbmRlck9wZXJhdG9yLmNyYzMuZ2V0RXJyb3IoKSA6IFwiXCJ9YCk7XG4gICAgICAgICAgICByZXR1cm4gX3ZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBJbml0aWFsaXplcyBvZmZzY3JlZW4tY2FudmFzLCByZW5kZXJpbmdjb250ZXh0IGFuZCBoYXJkd2FyZSB2aWV3cG9ydC5cbiAgICAgICAgICovXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgaW5pdGlhbGl6ZShfYW50aWFsaWFzOiBib29sZWFuID0gZmFsc2UsIF9hbHBoYTogYm9vbGVhbiA9IGZhbHNlKTogdm9pZCB7XG4gICAgICAgICAgICBsZXQgY29udGV4dEF0dHJpYnV0ZXM6IFdlYkdMQ29udGV4dEF0dHJpYnV0ZXMgPSB7IGFscGhhOiBfYWxwaGEsIGFudGlhbGlhczogX2FudGlhbGlhcyB9O1xuICAgICAgICAgICAgbGV0IGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpO1xuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMyA9IFJlbmRlck9wZXJhdG9yLmFzc2VydDxXZWJHTDJSZW5kZXJpbmdDb250ZXh0PihcbiAgICAgICAgICAgICAgICBjYW52YXMuZ2V0Q29udGV4dChcIndlYmdsMlwiLCBjb250ZXh0QXR0cmlidXRlcyksXG4gICAgICAgICAgICAgICAgXCJXZWJHTC1jb250ZXh0IGNvdWxkbid0IGJlIGNyZWF0ZWRcIlxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIC8vIEVuYWJsZSBiYWNrZmFjZS0gYW5kIHpCdWZmZXItY3VsbGluZy5cbiAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMuZW5hYmxlKFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuQ1VMTF9GQUNFKTtcbiAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMuZW5hYmxlKFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuREVQVEhfVEVTVCk7XG4gICAgICAgICAgICAvLyBSZW5kZXJPcGVyYXRvci5jcmMzLnBpeGVsU3RvcmVpKFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuVU5QQUNLX0ZMSVBfWV9XRUJHTCwgdHJ1ZSk7XG4gICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5yZWN0Vmlld3BvcnQgPSBSZW5kZXJPcGVyYXRvci5nZXRDYW52YXNSZWN0KCk7XG5cbiAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLnJlbmRlclNoYWRlclJheUNhc3QgPSBSZW5kZXJPcGVyYXRvci5jcmVhdGVQcm9ncmFtKFNoYWRlclJheUNhc3QpO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJldHVybiBhIHJlZmVyZW5jZSB0byB0aGUgb2Zmc2NyZWVuLWNhbnZhc1xuICAgICAgICAgKi9cbiAgICAgICAgcHVibGljIHN0YXRpYyBnZXRDYW52YXMoKTogSFRNTENhbnZhc0VsZW1lbnQge1xuICAgICAgICAgICAgcmV0dXJuIDxIVE1MQ2FudmFzRWxlbWVudD5SZW5kZXJPcGVyYXRvci5jcmMzLmNhbnZhczsgLy8gVE9ETzogZW5hYmxlIE9mZnNjcmVlbkNhbnZhc1xuICAgICAgICB9XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZXR1cm4gYSByZWZlcmVuY2UgdG8gdGhlIHJlbmRlcmluZyBjb250ZXh0XG4gICAgICAgICAqL1xuICAgICAgICBwdWJsaWMgc3RhdGljIGdldFJlbmRlcmluZ0NvbnRleHQoKTogV2ViR0wyUmVuZGVyaW5nQ29udGV4dCB7XG4gICAgICAgICAgICByZXR1cm4gUmVuZGVyT3BlcmF0b3IuY3JjMztcbiAgICAgICAgfVxuICAgICAgICAvKipcbiAgICAgICAgICogUmV0dXJuIGEgcmVjdGFuZ2xlIGRlc2NyaWJpbmcgdGhlIHNpemUgb2YgdGhlIG9mZnNjcmVlbi1jYW52YXMuIHgseSBhcmUgMCBhdCBhbGwgdGltZXMuXG4gICAgICAgICAqL1xuICAgICAgICBwdWJsaWMgc3RhdGljIGdldENhbnZhc1JlY3QoKTogUmVjdGFuZ2xlIHtcbiAgICAgICAgICAgIGxldCBjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50ID0gPEhUTUxDYW52YXNFbGVtZW50PlJlbmRlck9wZXJhdG9yLmNyYzMuY2FudmFzO1xuICAgICAgICAgICAgcmV0dXJuIFJlY3RhbmdsZS5HRVQoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcbiAgICAgICAgfVxuICAgICAgICAvKipcbiAgICAgICAgICogU2V0IHRoZSBzaXplIG9mIHRoZSBvZmZzY3JlZW4tY2FudmFzLlxuICAgICAgICAgKi9cbiAgICAgICAgcHVibGljIHN0YXRpYyBzZXRDYW52YXNTaXplKF93aWR0aDogbnVtYmVyLCBfaGVpZ2h0OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMuY2FudmFzLndpZHRoID0gX3dpZHRoO1xuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy5jYW52YXMuaGVpZ2h0ID0gX2hlaWdodDtcbiAgICAgICAgfVxuICAgICAgICAvKipcbiAgICAgICAgICogU2V0IHRoZSBhcmVhIG9uIHRoZSBvZmZzY3JlZW4tY2FudmFzIHRvIHJlbmRlciB0aGUgY2FtZXJhIGltYWdlIHRvLlxuICAgICAgICAgKiBAcGFyYW0gX3JlY3RcbiAgICAgICAgICovXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgc2V0Vmlld3BvcnRSZWN0YW5nbGUoX3JlY3Q6IFJlY3RhbmdsZSk6IHZvaWQge1xuICAgICAgICAgICAgT2JqZWN0LmFzc2lnbihSZW5kZXJPcGVyYXRvci5yZWN0Vmlld3BvcnQsIF9yZWN0KTtcbiAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMudmlld3BvcnQoX3JlY3QueCwgX3JlY3QueSwgX3JlY3Qud2lkdGgsIF9yZWN0LmhlaWdodCk7XG4gICAgICAgIH1cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJldHJpZXZlIHRoZSBhcmVhIG9uIHRoZSBvZmZzY3JlZW4tY2FudmFzIHRoZSBjYW1lcmEgaW1hZ2UgZ2V0cyByZW5kZXJlZCB0by5cbiAgICAgICAgICovXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgZ2V0Vmlld3BvcnRSZWN0YW5nbGUoKTogUmVjdGFuZ2xlIHtcbiAgICAgICAgICAgIHJldHVybiBSZW5kZXJPcGVyYXRvci5yZWN0Vmlld3BvcnQ7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogQ29udmVydCBsaWdodCBkYXRhIHRvIGZsYXQgYXJyYXlzXG4gICAgICAgICAqIFRPRE86IHRoaXMgbWV0aG9kIGFwcGVhcnMgdG8gYmUgb2Jzb2xldGUuLi4/XG4gICAgICAgICAqL1xuICAgICAgICBwcm90ZWN0ZWQgc3RhdGljIGNyZWF0ZVJlbmRlckxpZ2h0cyhfbGlnaHRzOiBNYXBMaWdodFR5cGVUb0xpZ2h0TGlzdCk6IFJlbmRlckxpZ2h0cyB7XG4gICAgICAgICAgICBsZXQgcmVuZGVyTGlnaHRzOiBSZW5kZXJMaWdodHMgPSB7fTtcbiAgICAgICAgICAgIGZvciAobGV0IGVudHJ5IG9mIF9saWdodHMpIHtcbiAgICAgICAgICAgICAgICAvLyBUT0RPOiBzaW1wbHlmeSwgc2luY2UgZGlyZWN0aW9uIGlzIG5vdyBoYW5kbGVkIGJ5IENvbXBvbmVudExpZ2h0XG4gICAgICAgICAgICAgICAgc3dpdGNoIChlbnRyeVswXSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIExpZ2h0QW1iaWVudC5uYW1lOlxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFtYmllbnQ6IG51bWJlcltdID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBjbXBMaWdodCBvZiBlbnRyeVsxXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjOiBDb2xvciA9IGNtcExpZ2h0LmxpZ2h0LmNvbG9yO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFtYmllbnQucHVzaChjLnIsIGMuZywgYy5iLCBjLmEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyTGlnaHRzW1widV9hbWJpZW50XCJdID0gbmV3IEZsb2F0MzJBcnJheShhbWJpZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIExpZ2h0RGlyZWN0aW9uYWwubmFtZTpcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBkaXJlY3Rpb25hbDogbnVtYmVyW10gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGNtcExpZ2h0IG9mIGVudHJ5WzFdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGM6IENvbG9yID0gY21wTGlnaHQubGlnaHQuY29sb3I7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbGV0IGQ6IFZlY3RvcjMgPSAoPExpZ2h0RGlyZWN0aW9uYWw+bGlnaHQuZ2V0TGlnaHQoKSkuZGlyZWN0aW9uO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpcmVjdGlvbmFsLnB1c2goYy5yLCBjLmcsIGMuYiwgYy5hLCAwLCAwLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlckxpZ2h0c1tcInVfZGlyZWN0aW9uYWxcIl0gPSBuZXcgRmxvYXQzMkFycmF5KGRpcmVjdGlvbmFsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgRGVidWcud2FybihcIlNoYWRlcnN0cnVjdHVyZSB1bmRlZmluZWQgZm9yXCIsIGVudHJ5WzBdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVuZGVyTGlnaHRzO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNldCBsaWdodCBkYXRhIGluIHNoYWRlcnNcbiAgICAgICAgICovXG4gICAgICAgIHByb3RlY3RlZCBzdGF0aWMgc2V0TGlnaHRzSW5TaGFkZXIoX3JlbmRlclNoYWRlcjogUmVuZGVyU2hhZGVyLCBfbGlnaHRzOiBNYXBMaWdodFR5cGVUb0xpZ2h0TGlzdCk6IHZvaWQge1xuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IudXNlUHJvZ3JhbShfcmVuZGVyU2hhZGVyKTtcbiAgICAgICAgICAgIGxldCB1bmk6IHsgW25hbWU6IHN0cmluZ106IFdlYkdMVW5pZm9ybUxvY2F0aW9uIH0gPSBfcmVuZGVyU2hhZGVyLnVuaWZvcm1zO1xuXG4gICAgICAgICAgICBsZXQgYW1iaWVudDogV2ViR0xVbmlmb3JtTG9jYXRpb24gPSB1bmlbXCJ1X2FtYmllbnQuY29sb3JcIl07XG4gICAgICAgICAgICBpZiAoYW1iaWVudCkge1xuICAgICAgICAgICAgICAgIGxldCBjbXBMaWdodHM6IENvbXBvbmVudExpZ2h0W10gPSBfbGlnaHRzLmdldChcIkxpZ2h0QW1iaWVudFwiKTtcbiAgICAgICAgICAgICAgICBpZiAoY21wTGlnaHRzKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRPRE86IGFkZCB1cCBhbWJpZW50IGxpZ2h0cyB0byBhIHNpbmdsZSBjb2xvclxuICAgICAgICAgICAgICAgICAgICAvLyBsZXQgcmVzdWx0OiBDb2xvciA9IG5ldyBDb2xvcigwLCAwLCAwLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgY21wTGlnaHQgb2YgY21wTGlnaHRzKVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZm9yIG5vdywgb25seSB0aGUgbGFzdCBpcyByZWxldmFudFxuICAgICAgICAgICAgICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy51bmlmb3JtNGZ2KGFtYmllbnQsIGNtcExpZ2h0LmxpZ2h0LmNvbG9yLmdldEFycmF5KCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGV0IG5EaXJlY3Rpb25hbDogV2ViR0xVbmlmb3JtTG9jYXRpb24gPSB1bmlbXCJ1X25MaWdodHNEaXJlY3Rpb25hbFwiXTtcbiAgICAgICAgICAgIGlmIChuRGlyZWN0aW9uYWwpIHtcbiAgICAgICAgICAgICAgICBsZXQgY21wTGlnaHRzOiBDb21wb25lbnRMaWdodFtdID0gX2xpZ2h0cy5nZXQoXCJMaWdodERpcmVjdGlvbmFsXCIpO1xuICAgICAgICAgICAgICAgIGlmIChjbXBMaWdodHMpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IG46IG51bWJlciA9IGNtcExpZ2h0cy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMudW5pZm9ybTF1aShuRGlyZWN0aW9uYWwsIG4pO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpOiBudW1iZXIgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgY21wTGlnaHQ6IENvbXBvbmVudExpZ2h0ID0gY21wTGlnaHRzW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy51bmlmb3JtNGZ2KHVuaVtgdV9kaXJlY3Rpb25hbFske2l9XS5jb2xvcmBdLCBjbXBMaWdodC5saWdodC5jb2xvci5nZXRBcnJheSgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBkaXJlY3Rpb246IFZlY3RvcjMgPSBWZWN0b3IzLlooKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpcmVjdGlvbi50cmFuc2Zvcm0oY21wTGlnaHQucGl2b3QpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGlyZWN0aW9uLnRyYW5zZm9ybShjbXBMaWdodC5nZXRDb250YWluZXIoKS5tdHhXb3JsZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLnVuaWZvcm0zZnYodW5pW2B1X2RpcmVjdGlvbmFsWyR7aX1dLmRpcmVjdGlvbmBdLCBkaXJlY3Rpb24uZ2V0KCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gZGVidWdnZXI7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogRHJhdyBhIG1lc2ggYnVmZmVyIHVzaW5nIHRoZSBnaXZlbiBpbmZvcyBhbmQgdGhlIGNvbXBsZXRlIHByb2plY3Rpb24gbWF0cml4XG4gICAgICAgICAqIEBwYXJhbSBfcmVuZGVyU2hhZGVyIFxuICAgICAgICAgKiBAcGFyYW0gX3JlbmRlckJ1ZmZlcnMgXG4gICAgICAgICAqIEBwYXJhbSBfcmVuZGVyQ29hdCBcbiAgICAgICAgICogQHBhcmFtIF93b3JsZCBcbiAgICAgICAgICogQHBhcmFtIF9wcm9qZWN0aW9uIFxuICAgICAgICAgKi9cbiAgICAgICAgcHJvdGVjdGVkIHN0YXRpYyBkcmF3KF9yZW5kZXJTaGFkZXI6IFJlbmRlclNoYWRlciwgX3JlbmRlckJ1ZmZlcnM6IFJlbmRlckJ1ZmZlcnMsIF9yZW5kZXJDb2F0OiBSZW5kZXJDb2F0LCBfd29ybGQ6IE1hdHJpeDR4NCwgX3Byb2plY3Rpb246IE1hdHJpeDR4NCk6IHZvaWQge1xuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IudXNlUHJvZ3JhbShfcmVuZGVyU2hhZGVyKTtcbiAgICAgICAgICAgIC8vIFJlbmRlck9wZXJhdG9yLnVzZUJ1ZmZlcnMoX3JlbmRlckJ1ZmZlcnMpO1xuICAgICAgICAgICAgLy8gUmVuZGVyT3BlcmF0b3IudXNlUGFyYW1ldGVyKF9yZW5kZXJDb2F0KTtcblxuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy5iaW5kQnVmZmVyKFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuQVJSQVlfQlVGRkVSLCBfcmVuZGVyQnVmZmVycy52ZXJ0aWNlcyk7XG4gICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLmVuYWJsZVZlcnRleEF0dHJpYkFycmF5KF9yZW5kZXJTaGFkZXIuYXR0cmlidXRlc1tcImFfcG9zaXRpb25cIl0pO1xuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3Iuc2V0QXR0cmlidXRlU3RydWN0dXJlKF9yZW5kZXJTaGFkZXIuYXR0cmlidXRlc1tcImFfcG9zaXRpb25cIl0sIE1lc2guZ2V0QnVmZmVyU3BlY2lmaWNhdGlvbigpKTtcblxuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy5iaW5kQnVmZmVyKFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuRUxFTUVOVF9BUlJBWV9CVUZGRVIsIF9yZW5kZXJCdWZmZXJzLmluZGljZXMpO1xuXG4gICAgICAgICAgICBpZiAoX3JlbmRlclNoYWRlci5hdHRyaWJ1dGVzW1wiYV90ZXh0dXJlVVZzXCJdKSB7XG4gICAgICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy5iaW5kQnVmZmVyKFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuQVJSQVlfQlVGRkVSLCBfcmVuZGVyQnVmZmVycy50ZXh0dXJlVVZzKTtcbiAgICAgICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLmVuYWJsZVZlcnRleEF0dHJpYkFycmF5KF9yZW5kZXJTaGFkZXIuYXR0cmlidXRlc1tcImFfdGV4dHVyZVVWc1wiXSk7IC8vIGVuYWJsZSB0aGUgYnVmZmVyXG4gICAgICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy52ZXJ0ZXhBdHRyaWJQb2ludGVyKF9yZW5kZXJTaGFkZXIuYXR0cmlidXRlc1tcImFfdGV4dHVyZVVWc1wiXSwgMiwgV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5GTE9BVCwgZmFsc2UsIDAsIDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gU3VwcGx5IG1hdHJpeGRhdGEgdG8gc2hhZGVyLiBcbiAgICAgICAgICAgIGxldCB1UHJvamVjdGlvbjogV2ViR0xVbmlmb3JtTG9jYXRpb24gPSBfcmVuZGVyU2hhZGVyLnVuaWZvcm1zW1widV9wcm9qZWN0aW9uXCJdO1xuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy51bmlmb3JtTWF0cml4NGZ2KHVQcm9qZWN0aW9uLCBmYWxzZSwgX3Byb2plY3Rpb24uZ2V0KCkpO1xuXG4gICAgICAgICAgICBpZiAoX3JlbmRlclNoYWRlci51bmlmb3Jtc1tcInVfd29ybGRcIl0pIHtcbiAgICAgICAgICAgICAgICBsZXQgdVdvcmxkOiBXZWJHTFVuaWZvcm1Mb2NhdGlvbiA9IF9yZW5kZXJTaGFkZXIudW5pZm9ybXNbXCJ1X3dvcmxkXCJdO1xuICAgICAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMudW5pZm9ybU1hdHJpeDRmdih1V29ybGQsIGZhbHNlLCBfd29ybGQuZ2V0KCkpO1xuXG4gICAgICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy5iaW5kQnVmZmVyKFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuQVJSQVlfQlVGRkVSLCBfcmVuZGVyQnVmZmVycy5ub3JtYWxzRmFjZSk7XG4gICAgICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy5lbmFibGVWZXJ0ZXhBdHRyaWJBcnJheShfcmVuZGVyU2hhZGVyLmF0dHJpYnV0ZXNbXCJhX25vcm1hbFwiXSk7XG4gICAgICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3Iuc2V0QXR0cmlidXRlU3RydWN0dXJlKF9yZW5kZXJTaGFkZXIuYXR0cmlidXRlc1tcImFfbm9ybWFsXCJdLCBNZXNoLmdldEJ1ZmZlclNwZWNpZmljYXRpb24oKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBUT0RPOiB0aGlzIGlzIGFsbCB0aGF0J3MgbGVmdCBvZiBjb2F0IGhhbmRsaW5nIGluIFJlbmRlck9wZXJhdG9yLCBkdWUgdG8gaW5qZWN0aW9uLiBTbyBleHRyYSByZWZlcmVuY2UgZnJvbSBub2RlIHRvIGNvYXQgaXMgdW5uZWNlc3NhcnlcbiAgICAgICAgICAgIF9yZW5kZXJDb2F0LmNvYXQudXNlUmVuZGVyRGF0YShfcmVuZGVyU2hhZGVyKTtcblxuICAgICAgICAgICAgLy8gRHJhdyBjYWxsXG4gICAgICAgICAgICAvLyBSZW5kZXJPcGVyYXRvci5jcmMzLmRyYXdFbGVtZW50cyhXZWJHTDJSZW5kZXJpbmdDb250ZXh0LlRSSUFOR0xFUywgTWVzaC5nZXRCdWZmZXJTcGVjaWZpY2F0aW9uKCkub2Zmc2V0LCBfcmVuZGVyQnVmZmVycy5uSW5kaWNlcyk7XG4gICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLmRyYXdFbGVtZW50cyhXZWJHTDJSZW5kZXJpbmdDb250ZXh0LlRSSUFOR0xFUywgX3JlbmRlckJ1ZmZlcnMubkluZGljZXMsIFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuVU5TSUdORURfU0hPUlQsIDApO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIERyYXcgYSBidWZmZXIgd2l0aCBhIHNwZWNpYWwgc2hhZGVyIHRoYXQgdXNlcyBhbiBpZCBpbnN0ZWFkIG9mIGEgY29sb3JcbiAgICAgICAgICogQHBhcmFtIF9yZW5kZXJTaGFkZXJcbiAgICAgICAgICogQHBhcmFtIF9yZW5kZXJCdWZmZXJzIFxuICAgICAgICAgKiBAcGFyYW0gX3dvcmxkIFxuICAgICAgICAgKiBAcGFyYW0gX3Byb2plY3Rpb24gXG4gICAgICAgICAqL1xuICAgICAgICBwcm90ZWN0ZWQgc3RhdGljIGRyYXdGb3JSYXlDYXN0KF9pZDogbnVtYmVyLCBfcmVuZGVyQnVmZmVyczogUmVuZGVyQnVmZmVycywgX3dvcmxkOiBNYXRyaXg0eDQsIF9wcm9qZWN0aW9uOiBNYXRyaXg0eDQpOiB2b2lkIHtcbiAgICAgICAgICAgIGxldCByZW5kZXJTaGFkZXI6IFJlbmRlclNoYWRlciA9IFJlbmRlck9wZXJhdG9yLnJlbmRlclNoYWRlclJheUNhc3Q7XG4gICAgICAgICAgICBSZW5kZXJPcGVyYXRvci51c2VQcm9ncmFtKHJlbmRlclNoYWRlcik7XG5cbiAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMuYmluZEJ1ZmZlcihXZWJHTDJSZW5kZXJpbmdDb250ZXh0LkFSUkFZX0JVRkZFUiwgX3JlbmRlckJ1ZmZlcnMudmVydGljZXMpO1xuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy5lbmFibGVWZXJ0ZXhBdHRyaWJBcnJheShyZW5kZXJTaGFkZXIuYXR0cmlidXRlc1tcImFfcG9zaXRpb25cIl0pO1xuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3Iuc2V0QXR0cmlidXRlU3RydWN0dXJlKHJlbmRlclNoYWRlci5hdHRyaWJ1dGVzW1wiYV9wb3NpdGlvblwiXSwgTWVzaC5nZXRCdWZmZXJTcGVjaWZpY2F0aW9uKCkpO1xuXG4gICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLmJpbmRCdWZmZXIoV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5FTEVNRU5UX0FSUkFZX0JVRkZFUiwgX3JlbmRlckJ1ZmZlcnMuaW5kaWNlcyk7XG5cbiAgICAgICAgICAgIC8vIFN1cHBseSBtYXRyaXhkYXRhIHRvIHNoYWRlci4gXG4gICAgICAgICAgICBsZXQgdVByb2plY3Rpb246IFdlYkdMVW5pZm9ybUxvY2F0aW9uID0gcmVuZGVyU2hhZGVyLnVuaWZvcm1zW1widV9wcm9qZWN0aW9uXCJdO1xuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy51bmlmb3JtTWF0cml4NGZ2KHVQcm9qZWN0aW9uLCBmYWxzZSwgX3Byb2plY3Rpb24uZ2V0KCkpO1xuXG4gICAgICAgICAgICBpZiAocmVuZGVyU2hhZGVyLnVuaWZvcm1zW1widV93b3JsZFwiXSkge1xuICAgICAgICAgICAgICAgIGxldCB1V29ybGQ6IFdlYkdMVW5pZm9ybUxvY2F0aW9uID0gcmVuZGVyU2hhZGVyLnVuaWZvcm1zW1widV93b3JsZFwiXTtcbiAgICAgICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLnVuaWZvcm1NYXRyaXg0ZnYodVdvcmxkLCBmYWxzZSwgX3dvcmxkLmdldCgpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGV0IGlkVW5pZm9ybUxvY2F0aW9uOiBXZWJHTFVuaWZvcm1Mb2NhdGlvbiA9IHJlbmRlclNoYWRlci51bmlmb3Jtc1tcInVfaWRcIl07XG4gICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5nZXRSZW5kZXJpbmdDb250ZXh0KCkudW5pZm9ybTFpKGlkVW5pZm9ybUxvY2F0aW9uLCBfaWQpO1xuXG4gICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLmRyYXdFbGVtZW50cyhXZWJHTDJSZW5kZXJpbmdDb250ZXh0LlRSSUFOR0xFUywgX3JlbmRlckJ1ZmZlcnMubkluZGljZXMsIFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuVU5TSUdORURfU0hPUlQsIDApO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gI3JlZ2lvbiBTaGFkZXJwcm9ncmFtIFxuICAgICAgICBwcm90ZWN0ZWQgc3RhdGljIGNyZWF0ZVByb2dyYW0oX3NoYWRlckNsYXNzOiB0eXBlb2YgU2hhZGVyKTogUmVuZGVyU2hhZGVyIHtcbiAgICAgICAgICAgIGxldCBjcmMzOiBXZWJHTDJSZW5kZXJpbmdDb250ZXh0ID0gUmVuZGVyT3BlcmF0b3IuY3JjMztcbiAgICAgICAgICAgIGxldCBwcm9ncmFtOiBXZWJHTFByb2dyYW0gPSBjcmMzLmNyZWF0ZVByb2dyYW0oKTtcbiAgICAgICAgICAgIGxldCByZW5kZXJTaGFkZXI6IFJlbmRlclNoYWRlcjtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY3JjMy5hdHRhY2hTaGFkZXIocHJvZ3JhbSwgUmVuZGVyT3BlcmF0b3IuYXNzZXJ0PFdlYkdMU2hhZGVyPihjb21waWxlU2hhZGVyKF9zaGFkZXJDbGFzcy5nZXRWZXJ0ZXhTaGFkZXJTb3VyY2UoKSwgV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5WRVJURVhfU0hBREVSKSkpO1xuICAgICAgICAgICAgICAgIGNyYzMuYXR0YWNoU2hhZGVyKHByb2dyYW0sIFJlbmRlck9wZXJhdG9yLmFzc2VydDxXZWJHTFNoYWRlcj4oY29tcGlsZVNoYWRlcihfc2hhZGVyQ2xhc3MuZ2V0RnJhZ21lbnRTaGFkZXJTb3VyY2UoKSwgV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5GUkFHTUVOVF9TSEFERVIpKSk7XG4gICAgICAgICAgICAgICAgY3JjMy5saW5rUHJvZ3JhbShwcm9ncmFtKTtcbiAgICAgICAgICAgICAgICBsZXQgZXJyb3I6IHN0cmluZyA9IFJlbmRlck9wZXJhdG9yLmFzc2VydDxzdHJpbmc+KGNyYzMuZ2V0UHJvZ3JhbUluZm9Mb2cocHJvZ3JhbSkpO1xuICAgICAgICAgICAgICAgIGlmIChlcnJvciAhPT0gXCJcIikge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFcnJvciBsaW5raW5nIFNoYWRlcjogXCIgKyBlcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlbmRlclNoYWRlciA9IHtcbiAgICAgICAgICAgICAgICAgICAgcHJvZ3JhbTogcHJvZ3JhbSxcbiAgICAgICAgICAgICAgICAgICAgYXR0cmlidXRlczogZGV0ZWN0QXR0cmlidXRlcygpLFxuICAgICAgICAgICAgICAgICAgICB1bmlmb3JtczogZGV0ZWN0VW5pZm9ybXMoKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGNhdGNoIChfZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBEZWJ1Zy5lcnJvcihfZXJyb3IpO1xuICAgICAgICAgICAgICAgIGRlYnVnZ2VyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlbmRlclNoYWRlcjtcblxuXG4gICAgICAgICAgICBmdW5jdGlvbiBjb21waWxlU2hhZGVyKF9zaGFkZXJDb2RlOiBzdHJpbmcsIF9zaGFkZXJUeXBlOiBHTGVudW0pOiBXZWJHTFNoYWRlciB8IG51bGwge1xuICAgICAgICAgICAgICAgIGxldCB3ZWJHTFNoYWRlcjogV2ViR0xTaGFkZXIgPSBjcmMzLmNyZWF0ZVNoYWRlcihfc2hhZGVyVHlwZSk7XG4gICAgICAgICAgICAgICAgY3JjMy5zaGFkZXJTb3VyY2Uod2ViR0xTaGFkZXIsIF9zaGFkZXJDb2RlKTtcbiAgICAgICAgICAgICAgICBjcmMzLmNvbXBpbGVTaGFkZXIod2ViR0xTaGFkZXIpO1xuICAgICAgICAgICAgICAgIGxldCBlcnJvcjogc3RyaW5nID0gUmVuZGVyT3BlcmF0b3IuYXNzZXJ0PHN0cmluZz4oY3JjMy5nZXRTaGFkZXJJbmZvTG9nKHdlYkdMU2hhZGVyKSk7XG4gICAgICAgICAgICAgICAgaWYgKGVycm9yICE9PSBcIlwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkVycm9yIGNvbXBpbGluZyBzaGFkZXI6IFwiICsgZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBDaGVjayBmb3IgYW55IGNvbXBpbGF0aW9uIGVycm9ycy5cbiAgICAgICAgICAgICAgICBpZiAoIWNyYzMuZ2V0U2hhZGVyUGFyYW1ldGVyKHdlYkdMU2hhZGVyLCBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LkNPTVBJTEVfU1RBVFVTKSkge1xuICAgICAgICAgICAgICAgICAgICBhbGVydChjcmMzLmdldFNoYWRlckluZm9Mb2cod2ViR0xTaGFkZXIpKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB3ZWJHTFNoYWRlcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZ1bmN0aW9uIGRldGVjdEF0dHJpYnV0ZXMoKTogeyBbbmFtZTogc3RyaW5nXTogbnVtYmVyIH0ge1xuICAgICAgICAgICAgICAgIGxldCBkZXRlY3RlZEF0dHJpYnV0ZXM6IHsgW25hbWU6IHN0cmluZ106IG51bWJlciB9ID0ge307XG4gICAgICAgICAgICAgICAgbGV0IGF0dHJpYnV0ZUNvdW50OiBudW1iZXIgPSBjcmMzLmdldFByb2dyYW1QYXJhbWV0ZXIocHJvZ3JhbSwgV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5BQ1RJVkVfQVRUUklCVVRFUyk7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaTogbnVtYmVyID0gMDsgaSA8IGF0dHJpYnV0ZUNvdW50OyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGF0dHJpYnV0ZUluZm86IFdlYkdMQWN0aXZlSW5mbyA9IFJlbmRlck9wZXJhdG9yLmFzc2VydDxXZWJHTEFjdGl2ZUluZm8+KGNyYzMuZ2V0QWN0aXZlQXR0cmliKHByb2dyYW0sIGkpKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFhdHRyaWJ1dGVJbmZvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBkZXRlY3RlZEF0dHJpYnV0ZXNbYXR0cmlidXRlSW5mby5uYW1lXSA9IGNyYzMuZ2V0QXR0cmliTG9jYXRpb24ocHJvZ3JhbSwgYXR0cmlidXRlSW5mby5uYW1lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRldGVjdGVkQXR0cmlidXRlcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZ1bmN0aW9uIGRldGVjdFVuaWZvcm1zKCk6IHsgW25hbWU6IHN0cmluZ106IFdlYkdMVW5pZm9ybUxvY2F0aW9uIH0ge1xuICAgICAgICAgICAgICAgIGxldCBkZXRlY3RlZFVuaWZvcm1zOiB7IFtuYW1lOiBzdHJpbmddOiBXZWJHTFVuaWZvcm1Mb2NhdGlvbiB9ID0ge307XG4gICAgICAgICAgICAgICAgbGV0IHVuaWZvcm1Db3VudDogbnVtYmVyID0gY3JjMy5nZXRQcm9ncmFtUGFyYW1ldGVyKHByb2dyYW0sIFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuQUNUSVZFX1VOSUZPUk1TKTtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpOiBudW1iZXIgPSAwOyBpIDwgdW5pZm9ybUNvdW50OyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGluZm86IFdlYkdMQWN0aXZlSW5mbyA9IFJlbmRlck9wZXJhdG9yLmFzc2VydDxXZWJHTEFjdGl2ZUluZm8+KGNyYzMuZ2V0QWN0aXZlVW5pZm9ybShwcm9ncmFtLCBpKSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghaW5mbykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZGV0ZWN0ZWRVbmlmb3Jtc1tpbmZvLm5hbWVdID0gUmVuZGVyT3BlcmF0b3IuYXNzZXJ0PFdlYkdMVW5pZm9ybUxvY2F0aW9uPihjcmMzLmdldFVuaWZvcm1Mb2NhdGlvbihwcm9ncmFtLCBpbmZvLm5hbWUpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRldGVjdGVkVW5pZm9ybXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcHJvdGVjdGVkIHN0YXRpYyB1c2VQcm9ncmFtKF9zaGFkZXJJbmZvOiBSZW5kZXJTaGFkZXIpOiB2b2lkIHtcbiAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMudXNlUHJvZ3JhbShfc2hhZGVySW5mby5wcm9ncmFtKTtcbiAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMuZW5hYmxlVmVydGV4QXR0cmliQXJyYXkoX3NoYWRlckluZm8uYXR0cmlidXRlc1tcImFfcG9zaXRpb25cIl0pO1xuICAgICAgICB9XG4gICAgICAgIHByb3RlY3RlZCBzdGF0aWMgZGVsZXRlUHJvZ3JhbShfcHJvZ3JhbTogUmVuZGVyU2hhZGVyKTogdm9pZCB7XG4gICAgICAgICAgICBpZiAoX3Byb2dyYW0pIHtcbiAgICAgICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLmRlbGV0ZVByb2dyYW0oX3Byb2dyYW0ucHJvZ3JhbSk7XG4gICAgICAgICAgICAgICAgZGVsZXRlIF9wcm9ncmFtLmF0dHJpYnV0ZXM7XG4gICAgICAgICAgICAgICAgZGVsZXRlIF9wcm9ncmFtLnVuaWZvcm1zO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vICNlbmRyZWdpb25cblxuICAgICAgICAvLyAjcmVnaW9uIE1lc2hidWZmZXJcbiAgICAgICAgcHJvdGVjdGVkIHN0YXRpYyBjcmVhdGVCdWZmZXJzKF9tZXNoOiBNZXNoKTogUmVuZGVyQnVmZmVycyB7XG4gICAgICAgICAgICBsZXQgdmVydGljZXM6IFdlYkdMQnVmZmVyID0gUmVuZGVyT3BlcmF0b3IuYXNzZXJ0PFdlYkdMQnVmZmVyPihSZW5kZXJPcGVyYXRvci5jcmMzLmNyZWF0ZUJ1ZmZlcigpKTtcbiAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMuYmluZEJ1ZmZlcihXZWJHTDJSZW5kZXJpbmdDb250ZXh0LkFSUkFZX0JVRkZFUiwgdmVydGljZXMpO1xuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy5idWZmZXJEYXRhKFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuQVJSQVlfQlVGRkVSLCBfbWVzaC52ZXJ0aWNlcywgV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5TVEFUSUNfRFJBVyk7XG5cbiAgICAgICAgICAgIGxldCBpbmRpY2VzOiBXZWJHTEJ1ZmZlciA9IFJlbmRlck9wZXJhdG9yLmFzc2VydDxXZWJHTEJ1ZmZlcj4oUmVuZGVyT3BlcmF0b3IuY3JjMy5jcmVhdGVCdWZmZXIoKSk7XG4gICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLmJpbmRCdWZmZXIoV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5FTEVNRU5UX0FSUkFZX0JVRkZFUiwgaW5kaWNlcyk7XG4gICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLmJ1ZmZlckRhdGEoV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5FTEVNRU5UX0FSUkFZX0JVRkZFUiwgX21lc2guaW5kaWNlcywgV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5TVEFUSUNfRFJBVyk7XG5cbiAgICAgICAgICAgIGxldCB0ZXh0dXJlVVZzOiBXZWJHTEJ1ZmZlciA9IFJlbmRlck9wZXJhdG9yLmNyYzMuY3JlYXRlQnVmZmVyKCk7XG4gICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLmJpbmRCdWZmZXIoV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5BUlJBWV9CVUZGRVIsIHRleHR1cmVVVnMpO1xuICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy5idWZmZXJEYXRhKFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuQVJSQVlfQlVGRkVSLCBfbWVzaC50ZXh0dXJlVVZzLCBXZWJHTDJSZW5kZXJpbmdDb250ZXh0LlNUQVRJQ19EUkFXKTtcblxuICAgICAgICAgICAgbGV0IG5vcm1hbHNGYWNlOiBXZWJHTEJ1ZmZlciA9IFJlbmRlck9wZXJhdG9yLmFzc2VydDxXZWJHTEJ1ZmZlcj4oUmVuZGVyT3BlcmF0b3IuY3JjMy5jcmVhdGVCdWZmZXIoKSk7XG4gICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLmJpbmRCdWZmZXIoV2ViR0wyUmVuZGVyaW5nQ29udGV4dC5BUlJBWV9CVUZGRVIsIG5vcm1hbHNGYWNlKTtcbiAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMuYnVmZmVyRGF0YShXZWJHTDJSZW5kZXJpbmdDb250ZXh0LkFSUkFZX0JVRkZFUiwgX21lc2gubm9ybWFsc0ZhY2UsIFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuU1RBVElDX0RSQVcpO1xuXG4gICAgICAgICAgICBsZXQgYnVmZmVySW5mbzogUmVuZGVyQnVmZmVycyA9IHtcbiAgICAgICAgICAgICAgICB2ZXJ0aWNlczogdmVydGljZXMsXG4gICAgICAgICAgICAgICAgaW5kaWNlczogaW5kaWNlcyxcbiAgICAgICAgICAgICAgICBuSW5kaWNlczogX21lc2guZ2V0SW5kZXhDb3VudCgpLFxuICAgICAgICAgICAgICAgIHRleHR1cmVVVnM6IHRleHR1cmVVVnMsXG4gICAgICAgICAgICAgICAgbm9ybWFsc0ZhY2U6IG5vcm1hbHNGYWNlXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuIGJ1ZmZlckluZm87XG4gICAgICAgIH1cbiAgICAgICAgcHJvdGVjdGVkIHN0YXRpYyB1c2VCdWZmZXJzKF9yZW5kZXJCdWZmZXJzOiBSZW5kZXJCdWZmZXJzKTogdm9pZCB7XG4gICAgICAgICAgICAvLyBUT0RPOiBjdXJyZW50bHkgdW51c2VkLCBkb25lIHNwZWNpZmljYWxseSBpbiBkcmF3LiBDb3VsZCBiZSBzYXZlZCBpbiBWQU8gd2l0aGluIFJlbmRlckJ1ZmZlcnNcbiAgICAgICAgICAgIC8vIFJlbmRlck9wZXJhdG9yLmNyYzMuYmluZEJ1ZmZlcihXZWJHTDJSZW5kZXJpbmdDb250ZXh0LkFSUkFZX0JVRkZFUiwgX3JlbmRlckJ1ZmZlcnMudmVydGljZXMpO1xuICAgICAgICAgICAgLy8gUmVuZGVyT3BlcmF0b3IuY3JjMy5iaW5kQnVmZmVyKFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuRUxFTUVOVF9BUlJBWV9CVUZGRVIsIF9yZW5kZXJCdWZmZXJzLmluZGljZXMpO1xuICAgICAgICAgICAgLy8gUmVuZGVyT3BlcmF0b3IuY3JjMy5iaW5kQnVmZmVyKFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuQVJSQVlfQlVGRkVSLCBfcmVuZGVyQnVmZmVycy50ZXh0dXJlVVZzKTtcblxuICAgICAgICB9XG4gICAgICAgIHByb3RlY3RlZCBzdGF0aWMgZGVsZXRlQnVmZmVycyhfcmVuZGVyQnVmZmVyczogUmVuZGVyQnVmZmVycyk6IHZvaWQge1xuICAgICAgICAgICAgaWYgKF9yZW5kZXJCdWZmZXJzKSB7XG4gICAgICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy5iaW5kQnVmZmVyKFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuQVJSQVlfQlVGRkVSLCBudWxsKTtcbiAgICAgICAgICAgICAgICBSZW5kZXJPcGVyYXRvci5jcmMzLmRlbGV0ZUJ1ZmZlcihfcmVuZGVyQnVmZmVycy52ZXJ0aWNlcyk7XG4gICAgICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy5kZWxldGVCdWZmZXIoX3JlbmRlckJ1ZmZlcnMudGV4dHVyZVVWcyk7XG4gICAgICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy5iaW5kQnVmZmVyKFdlYkdMMlJlbmRlcmluZ0NvbnRleHQuRUxFTUVOVF9BUlJBWV9CVUZGRVIsIG51bGwpO1xuICAgICAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMuZGVsZXRlQnVmZmVyKF9yZW5kZXJCdWZmZXJzLmluZGljZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vICNlbmRyZWdpb25cblxuICAgICAgICAvLyAjcmVnaW9uIE1hdGVyaWFsUGFyYW1ldGVyc1xuICAgICAgICBwcm90ZWN0ZWQgc3RhdGljIGNyZWF0ZVBhcmFtZXRlcihfY29hdDogQ29hdCk6IFJlbmRlckNvYXQge1xuICAgICAgICAgICAgLy8gbGV0IHZhbzogV2ViR0xWZXJ0ZXhBcnJheU9iamVjdCA9IFJlbmRlck9wZXJhdG9yLmFzc2VydDxXZWJHTFZlcnRleEFycmF5T2JqZWN0PihSZW5kZXJPcGVyYXRvci5jcmMzLmNyZWF0ZVZlcnRleEFycmF5KCkpO1xuICAgICAgICAgICAgbGV0IGNvYXRJbmZvOiBSZW5kZXJDb2F0ID0ge1xuICAgICAgICAgICAgICAgIC8vdmFvOiBudWxsLFxuICAgICAgICAgICAgICAgIGNvYXQ6IF9jb2F0XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuIGNvYXRJbmZvO1xuICAgICAgICB9XG4gICAgICAgIHByb3RlY3RlZCBzdGF0aWMgdXNlUGFyYW1ldGVyKF9jb2F0SW5mbzogUmVuZGVyQ29hdCk6IHZvaWQge1xuICAgICAgICAgICAgLy8gUmVuZGVyT3BlcmF0b3IuY3JjMy5iaW5kVmVydGV4QXJyYXkoX2NvYXRJbmZvLnZhbyk7XG4gICAgICAgIH1cbiAgICAgICAgcHJvdGVjdGVkIHN0YXRpYyBkZWxldGVQYXJhbWV0ZXIoX2NvYXRJbmZvOiBSZW5kZXJDb2F0KTogdm9pZCB7XG4gICAgICAgICAgICBpZiAoX2NvYXRJbmZvKSB7XG4gICAgICAgICAgICAgICAgUmVuZGVyT3BlcmF0b3IuY3JjMy5iaW5kVmVydGV4QXJyYXkobnVsbCk7XG4gICAgICAgICAgICAgICAgLy8gUmVuZGVyT3BlcmF0b3IuY3JjMy5kZWxldGVWZXJ0ZXhBcnJheShfY29hdEluZm8udmFvKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyAjZW5kcmVnaW9uXG5cbiAgICAgICAgLyoqIFxuICAgICAgICAgKiBXcmFwcGVyIGZ1bmN0aW9uIHRvIHV0aWxpemUgdGhlIGJ1ZmZlclNwZWNpZmljYXRpb24gaW50ZXJmYWNlIHdoZW4gcGFzc2luZyBkYXRhIHRvIHRoZSBzaGFkZXIgdmlhIGEgYnVmZmVyLlxuICAgICAgICAgKiBAcGFyYW0gX2F0dHJpYnV0ZUxvY2F0aW9uIC8vIFRoZSBsb2NhdGlvbiBvZiB0aGUgYXR0cmlidXRlIG9uIHRoZSBzaGFkZXIsIHRvIHdoaWNoIHRoZXkgZGF0YSB3aWxsIGJlIHBhc3NlZC5cbiAgICAgICAgICogQHBhcmFtIF9idWZmZXJTcGVjaWZpY2F0aW9uIC8vIEludGVyZmFjZSBwYXNzaW5nIGRhdGFwdWxsc3BlY2lmaWNhdGlvbnMgdG8gdGhlIGJ1ZmZlci5cbiAgICAgICAgICovXG4gICAgICAgIHByaXZhdGUgc3RhdGljIHNldEF0dHJpYnV0ZVN0cnVjdHVyZShfYXR0cmlidXRlTG9jYXRpb246IG51bWJlciwgX2J1ZmZlclNwZWNpZmljYXRpb246IEJ1ZmZlclNwZWNpZmljYXRpb24pOiB2b2lkIHtcbiAgICAgICAgICAgIFJlbmRlck9wZXJhdG9yLmNyYzMudmVydGV4QXR0cmliUG9pbnRlcihfYXR0cmlidXRlTG9jYXRpb24sIF9idWZmZXJTcGVjaWZpY2F0aW9uLnNpemUsIF9idWZmZXJTcGVjaWZpY2F0aW9uLmRhdGFUeXBlLCBfYnVmZmVyU3BlY2lmaWNhdGlvbi5ub3JtYWxpemUsIF9idWZmZXJTcGVjaWZpY2F0aW9uLnN0cmlkZSwgX2J1ZmZlclNwZWNpZmljYXRpb24ub2Zmc2V0KTtcbiAgICAgICAgfVxuICAgIH1cbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vVHJhbnNmZXIvTXV0YWJsZS50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi9SZW5kZXIvUmVuZGVySW5qZWN0b3IudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vUmVuZGVyL1JlbmRlck9wZXJhdG9yLnRzXCIvPlxubmFtZXNwYWNlIEZ1ZGdlQ29yZSB7XG4gICAgLyoqXG4gICAgICogSG9sZHMgZGF0YSB0byBmZWVkIGludG8gYSBbW1NoYWRlcl1dIHRvIGRlc2NyaWJlIHRoZSBzdXJmYWNlIG9mIFtbTWVzaF1dLiAgXG4gICAgICogW1tNYXRlcmlhbF1dcyByZWZlcmVuY2UgW1tDb2F0XV0gYW5kIFtbU2hhZGVyXV0uICAgXG4gICAgICogVGhlIG1ldGhvZCB1c2VSZW5kZXJEYXRhIHdpbGwgYmUgaW5qZWN0ZWQgYnkgW1tSZW5kZXJJbmplY3Rvcl1dIGF0IHJ1bnRpbWUsIGV4dGVuZGluZyB0aGUgZnVuY3Rpb25hbGl0eSBvZiB0aGlzIGNsYXNzIHRvIGRlYWwgd2l0aCB0aGUgcmVuZGVyZXIuXG4gICAgICovXG4gICAgZXhwb3J0IGNsYXNzIENvYXQgZXh0ZW5kcyBNdXRhYmxlIGltcGxlbWVudHMgU2VyaWFsaXphYmxlIHtcbiAgICAgICAgcHVibGljIG5hbWU6IHN0cmluZyA9IFwiQ29hdFwiO1xuICAgICAgICBwcm90ZWN0ZWQgcmVuZGVyRGF0YToge1trZXk6IHN0cmluZ106IHVua25vd259O1xuXG4gICAgICAgIHB1YmxpYyBtdXRhdGUoX211dGF0b3I6IE11dGF0b3IpOiB2b2lkIHtcbiAgICAgICAgICAgIHN1cGVyLm11dGF0ZShfbXV0YXRvcik7XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgdXNlUmVuZGVyRGF0YShfcmVuZGVyU2hhZGVyOiBSZW5kZXJTaGFkZXIpOiB2b2lkIHsvKiBpbmplY3RlZCBieSBSZW5kZXJJbmplY3RvciovIH1cbiAgICAgICAgXG4gICAgICAgIC8vI3JlZ2lvbiBUcmFuc2ZlclxuICAgICAgICBwdWJsaWMgc2VyaWFsaXplKCk6IFNlcmlhbGl6YXRpb24ge1xuICAgICAgICAgICAgbGV0IHNlcmlhbGl6YXRpb246IFNlcmlhbGl6YXRpb24gPSB0aGlzLmdldE11dGF0b3IoKTsgXG4gICAgICAgICAgICByZXR1cm4gc2VyaWFsaXphdGlvbjtcbiAgICAgICAgfVxuICAgICAgICBwdWJsaWMgZGVzZXJpYWxpemUoX3NlcmlhbGl6YXRpb246IFNlcmlhbGl6YXRpb24pOiBTZXJpYWxpemFibGUge1xuICAgICAgICAgICAgdGhpcy5tdXRhdGUoX3NlcmlhbGl6YXRpb24pO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBwcm90ZWN0ZWQgcmVkdWNlTXV0YXRvcigpOiB2b2lkIHsgLyoqLyB9XG4gICAgICAgIC8vI2VuZHJlZ2lvblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRoZSBzaW1wbGVzdCBbW0NvYXRdXSBwcm92aWRpbmcganVzdCBhIGNvbG9yXG4gICAgICovXG4gICAgQFJlbmRlckluamVjdG9yLmRlY29yYXRlQ29hdFxuICAgIGV4cG9ydCBjbGFzcyBDb2F0Q29sb3JlZCBleHRlbmRzIENvYXQge1xuICAgICAgICBwdWJsaWMgY29sb3I6IENvbG9yO1xuXG4gICAgICAgIGNvbnN0cnVjdG9yKF9jb2xvcj86IENvbG9yKSB7XG4gICAgICAgICAgICBzdXBlcigpO1xuICAgICAgICAgICAgdGhpcy5jb2xvciA9IF9jb2xvciB8fCBuZXcgQ29sb3IoMC41LCAwLjUsIDAuNSwgMSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBIFtbQ29hdF1dIHByb3ZpZGluZyBhIHRleHR1cmUgYW5kIGFkZGl0aW9uYWwgZGF0YSBmb3IgdGV4dHVyaW5nXG4gICAgICovXG4gICAgQFJlbmRlckluamVjdG9yLmRlY29yYXRlQ29hdFxuICAgIGV4cG9ydCBjbGFzcyBDb2F0VGV4dHVyZWQgZXh0ZW5kcyBDb2F0IHtcbiAgICAgICAgcHVibGljIHRleHR1cmU6IFRleHR1cmVJbWFnZSA9IG51bGw7XG4gICAgICAgIC8vIGp1c3QgaWRlYXMgc28gZmFyXG4gICAgICAgIHB1YmxpYyB0aWxpbmdYOiBudW1iZXI7XG4gICAgICAgIHB1YmxpYyB0aWxpbmdZOiBudW1iZXI7XG4gICAgICAgIHB1YmxpYyByZXBldGl0aW9uOiBib29sZWFuO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBBIFtbQ29hdF1dIHRvIGJlIHVzZWQgYnkgdGhlIE1hdENhcCBTaGFkZXIgcHJvdmlkaW5nIGEgdGV4dHVyZSwgYSB0aW50IGNvbG9yICgwLjUgZ3JleSBpcyBuZXV0cmFsKVxuICAgICAqIGFuZCBhIGZsYXRNaXggbnVtYmVyIGZvciBtaXhpbmcgYmV0d2VlbiBzbW9vdGggYW5kIGZsYXQgc2hhZGluZy5cbiAgICAgKi9cbiAgICBAUmVuZGVySW5qZWN0b3IuZGVjb3JhdGVDb2F0XG4gICAgZXhwb3J0IGNsYXNzIENvYXRNYXRDYXAgZXh0ZW5kcyBDb2F0IHtcbiAgICAgICAgcHVibGljIHRleHR1cmU6IFRleHR1cmVJbWFnZSA9IG51bGw7XG4gICAgICAgIHB1YmxpYyB0aW50Q29sb3I6IENvbG9yID0gbmV3IENvbG9yKDAuNSwgMC41LCAwLjUsIDEpO1xuICAgICAgICBwdWJsaWMgZmxhdE1peDogbnVtYmVyID0gMC41O1xuXG4gICAgICAgIGNvbnN0cnVjdG9yKF90ZXh0dXJlPzogVGV4dHVyZUltYWdlLCBfdGludGNvbG9yPzogQ29sb3IsIF9mbGF0bWl4PzogbnVtYmVyKSB7XG4gICAgICAgICAgICBzdXBlcigpO1xuICAgICAgICAgICAgdGhpcy50ZXh0dXJlID0gX3RleHR1cmUgfHwgbmV3IFRleHR1cmVJbWFnZSgpO1xuICAgICAgICAgICAgdGhpcy50aW50Q29sb3IgPSBfdGludGNvbG9yIHx8IG5ldyBDb2xvcigwLjUsIDAuNSwgMC41LCAxKTtcbiAgICAgICAgICAgIHRoaXMuZmxhdE1peCA9IF9mbGF0bWl4ID4gMS4wID8gdGhpcy5mbGF0TWl4ID0gMS4wIDogdGhpcy5mbGF0TWl4ID0gX2ZsYXRtaXggfHwgMC41O1xuICAgICAgICB9XG4gICAgfVxufSIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi9UcmFuc2Zlci9TZXJpYWxpemVyLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL1RyYW5zZmVyL011dGFibGUudHNcIi8+XG5uYW1lc3BhY2UgRnVkZ2VDb3JlIHtcbiAgICAvKiogXG4gICAgICogU3VwZXJjbGFzcyBmb3IgYWxsIFtbQ29tcG9uZW50XV1zIHRoYXQgY2FuIGJlIGF0dGFjaGVkIHRvIFtbTm9kZV1dcy5cbiAgICAgKiBAYXV0aG9ycyBKYXNjaGEgS2FyYWfDtmwsIEhGVSwgMjAxOSB8IEppcmthIERlbGwnT3JvLUZyaWVkbCwgSEZVLCAyMDE5XG4gICAgICovXG4gICAgZXhwb3J0IGFic3RyYWN0IGNsYXNzIENvbXBvbmVudCBleHRlbmRzIE11dGFibGUgaW1wbGVtZW50cyBTZXJpYWxpemFibGUge1xuICAgICAgICBwcm90ZWN0ZWQgc2luZ2xldG9uOiBib29sZWFuID0gdHJ1ZTtcbiAgICAgICAgcHJpdmF0ZSBjb250YWluZXI6IE5vZGUgfCBudWxsID0gbnVsbDtcbiAgICAgICAgcHJpdmF0ZSBhY3RpdmU6IGJvb2xlYW4gPSB0cnVlO1xuXG4gICAgICAgIHB1YmxpYyBhY3RpdmF0ZShfb246IGJvb2xlYW4pOiB2b2lkIHtcbiAgICAgICAgICAgIHRoaXMuYWN0aXZlID0gX29uO1xuICAgICAgICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudChfb24gPyBFVkVOVC5DT01QT05FTlRfQUNUSVZBVEUgOiBFVkVOVC5DT01QT05FTlRfREVBQ1RJVkFURSkpO1xuICAgICAgICB9XG4gICAgICAgIHB1YmxpYyBnZXQgaXNBY3RpdmUoKTogYm9vbGVhbiB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hY3RpdmU7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogSXMgdHJ1ZSwgd2hlbiBvbmx5IG9uZSBpbnN0YW5jZSBvZiB0aGUgY29tcG9uZW50IGNsYXNzIGNhbiBiZSBhdHRhY2hlZCB0byBhIG5vZGVcbiAgICAgICAgICovXG4gICAgICAgIHB1YmxpYyBnZXQgaXNTaW5nbGV0b24oKTogYm9vbGVhbiB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zaW5nbGV0b247XG4gICAgICAgIH1cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJldHJpZXZlcyB0aGUgbm9kZSwgdGhpcyBjb21wb25lbnQgaXMgY3VycmVudGx5IGF0dGFjaGVkIHRvXG4gICAgICAgICAqIEByZXR1cm5zIFRoZSBjb250YWluZXIgbm9kZSBvciBudWxsLCBpZiB0aGUgY29tcG9uZW50IGlzIG5vdCBhdHRhY2hlZCB0b1xuICAgICAgICAgKi9cbiAgICAgICAgcHVibGljIGdldENvbnRhaW5lcigpOiBOb2RlIHwgbnVsbCB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb250YWluZXI7XG4gICAgICAgIH1cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRyaWVzIHRvIGFkZCB0aGUgY29tcG9uZW50IHRvIHRoZSBnaXZlbiBub2RlLCByZW1vdmluZyBpdCBmcm9tIHRoZSBwcmV2aW91cyBjb250YWluZXIgaWYgYXBwbGljYWJsZVxuICAgICAgICAgKiBAcGFyYW0gX2NvbnRhaW5lciBUaGUgbm9kZSB0byBhdHRhY2ggdGhpcyBjb21wb25lbnQgdG9cbiAgICAgICAgICovXG4gICAgICAgIHB1YmxpYyBzZXRDb250YWluZXIoX2NvbnRhaW5lcjogTm9kZSB8IG51bGwpOiB2b2lkIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbnRhaW5lciA9PSBfY29udGFpbmVyKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIGxldCBwcmV2aW91c0NvbnRhaW5lcjogTm9kZSA9IHRoaXMuY29udGFpbmVyO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBpZiAocHJldmlvdXNDb250YWluZXIpXG4gICAgICAgICAgICAgICAgICAgIHByZXZpb3VzQ29udGFpbmVyLnJlbW92ZUNvbXBvbmVudCh0aGlzKTtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbnRhaW5lciA9IF9jb250YWluZXI7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29udGFpbmVyKVxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbnRhaW5lci5hZGRDb21wb25lbnQodGhpcyk7XG4gICAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbnRhaW5lciA9IHByZXZpb3VzQ29udGFpbmVyO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vI3JlZ2lvbiBUcmFuc2ZlclxuICAgICAgICBwdWJsaWMgc2VyaWFsaXplKCk6IFNlcmlhbGl6YXRpb24ge1xuICAgICAgICAgICAgbGV0IHNlcmlhbGl6YXRpb246IFNlcmlhbGl6YXRpb24gPSB7XG4gICAgICAgICAgICAgICAgYWN0aXZlOiB0aGlzLmFjdGl2ZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiBzZXJpYWxpemF0aW9uO1xuICAgICAgICB9XG4gICAgICAgIHB1YmxpYyBkZXNlcmlhbGl6ZShfc2VyaWFsaXphdGlvbjogU2VyaWFsaXphdGlvbik6IFNlcmlhbGl6YWJsZSB7XG4gICAgICAgICAgICB0aGlzLmFjdGl2ZSA9IF9zZXJpYWxpemF0aW9uLmFjdGl2ZTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgcHJvdGVjdGVkIHJlZHVjZU11dGF0b3IoX211dGF0b3I6IE11dGF0b3IpOiB2b2lkIHtcbiAgICAgICAgICAgIGRlbGV0ZSBfbXV0YXRvci5zaW5nbGV0b247XG4gICAgICAgICAgICBkZWxldGUgX211dGF0b3IuY29udGFpbmVyO1xuICAgICAgICB9XG4gICAgICAgIC8vI2VuZHJlZ2lvblxuICAgIH1cbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiQ29tcG9uZW50LnRzXCIvPlxubmFtZXNwYWNlIEZ1ZGdlQ29yZSB7XG4gIC8qKlxuICAgKiBIb2xkcyBkaWZmZXJlbnQgcGxheW1vZGVzIHRoZSBhbmltYXRpb24gdXNlcyB0byBwbGF5IGJhY2sgaXRzIGFuaW1hdGlvbi5cbiAgICogQGF1dGhvciBMdWthcyBTY2hldWVybGUsIEhGVSwgMjAxOVxuICAgKi9cbiAgZXhwb3J0IGVudW0gQU5JTUFUSU9OX1BMQVlNT0RFIHtcbiAgICAvKipQbGF5cyBhbmltYXRpb24gaW4gYSBsb29wOiBpdCByZXN0YXJ0cyBvbmNlIGl0IGhpdCB0aGUgZW5kLiovXG4gICAgTE9PUCxcbiAgICAvKipQbGF5cyBhbmltYXRpb24gb25jZSBhbmQgc3RvcHMgYXQgdGhlIGxhc3Qga2V5L2ZyYW1lKi9cbiAgICBQTEFZT05DRSxcbiAgICAvKipQbGF5cyBhbmltYXRpb24gb25jZSBhbmQgc3RvcHMgb24gdGhlIGZpcnN0IGtleS9mcmFtZSAqL1xuICAgIFBMQVlPTkNFU1RPUEFGVEVSLFxuICAgIC8qKlBsYXlzIGFuaW1hdGlvbiBsaWtlIExPT1AsIGJ1dCBiYWNrd2FyZHMuKi9cbiAgICBSRVZFUlNFTE9PUCxcbiAgICAvKipDYXVzZXMgdGhlIGFuaW1hdGlvbiBub3QgdG8gcGxheSBhdCBhbGwuIFVzZWZ1bCBmb3IganVtcGluZyB0byB2YXJpb3VzIHBvc2l0aW9ucyBpbiB0aGUgYW5pbWF0aW9uIHdpdGhvdXQgcHJvY2VlZGluZyBpbiB0aGUgYW5pbWF0aW9uLiovXG4gICAgU1RPUFxuICAgIC8vVE9ETzogYWRkIGFuIElOSEVSSVQgYW5kIGEgUElOR1BPTkcgbW9kZVxuICB9XG5cbiAgZXhwb3J0IGVudW0gQU5JTUFUSU9OX1BMQVlCQUNLIHtcbiAgICAvL1RPRE86IGFkZCBhbiBpbi1kZXB0aCBkZXNjcmlwdGlvbiBvZiB3aGF0IGhhcHBlbnMgdG8gdGhlIGFuaW1hdGlvbiAoYW5kIGV2ZW50cykgZGVwZW5kaW5nIG9uIHRoZSBQbGF5YmFjay4gVXNlIEdyYXBocyB0byBleHBsYWluLlxuICAgIC8qKkNhbGN1bGF0ZXMgdGhlIHN0YXRlIG9mIHRoZSBhbmltYXRpb24gYXQgdGhlIGV4YWN0IHBvc2l0aW9uIG9mIHRpbWUuIElnbm9yZXMgRlBTIHZhbHVlIG9mIGFuaW1hdGlvbi4qL1xuICAgIFRJTUVCQVNFRF9DT05USU5PVVMsXG4gICAgLyoqTGltaXRzIHRoZSBjYWxjdWxhdGlvbiBvZiB0aGUgc3RhdGUgb2YgdGhlIGFuaW1hdGlvbiB0byB0aGUgRlBTIHZhbHVlIG9mIHRoZSBhbmltYXRpb24uIFNraXBzIGZyYW1lcyBpZiBuZWVkZWQuKi9cbiAgICBUSU1FQkFTRURfUkFTVEVSRURfVE9fRlBTLFxuICAgIC8qKlVzZXMgdGhlIEZQUyB2YWx1ZSBvZiB0aGUgYW5pbWF0aW9uIHRvIGFkdmFuY2Ugb25jZSBwZXIgZnJhbWUsIG5vIG1hdHRlciB0aGUgc3BlZWQgb2YgdGhlIGZyYW1lcy4gRG9lc24ndCBza2lwIGFueSBmcmFtZXMuKi9cbiAgICBGUkFNRUJBU0VEXG4gIH1cblxuICAvKipcbiAgICogSG9sZHMgYSByZWZlcmVuY2UgdG8gYW4gW1tBbmltYXRpb25dXSBhbmQgY29udHJvbHMgaXQuIENvbnRyb2xzIHBsYXliYWNrIGFuZCBwbGF5bW9kZSBhcyB3ZWxsIGFzIHNwZWVkLlxuICAgKiBAYXV0aG9ycyBMdWthcyBTY2hldWVybGUsIEhGVSwgMjAxOVxuICAgKi9cbiAgZXhwb3J0IGNsYXNzIENvbXBvbmVudEFuaW1hdG9yIGV4dGVuZHMgQ29tcG9uZW50IHtcbiAgICAvL1RPRE86IGFkZCBmdW5jdGlvbmFsaXR5IHRvIGJsZW5kIGZyb20gb25lIGFuaW1hdGlvbiB0byBhbm90aGVyLlxuICAgIGFuaW1hdGlvbjogQW5pbWF0aW9uO1xuICAgIHBsYXltb2RlOiBBTklNQVRJT05fUExBWU1PREU7XG4gICAgcGxheWJhY2s6IEFOSU1BVElPTl9QTEFZQkFDSztcbiAgICBzcGVlZFNjYWxlc1dpdGhHbG9iYWxTcGVlZDogYm9vbGVhbiA9IHRydWU7XG5cbiAgICBwcml2YXRlIGxvY2FsVGltZTogVGltZTtcbiAgICBwcml2YXRlIHNwZWVkU2NhbGU6IG51bWJlciA9IDE7XG4gICAgcHJpdmF0ZSBsYXN0VGltZTogbnVtYmVyID0gMDtcblxuICAgIGNvbnN0cnVjdG9yKF9hbmltYXRpb246IEFuaW1hdGlvbiA9IG5ldyBBbmltYXRpb24oXCJcIiksIF9wbGF5bW9kZTogQU5JTUFUSU9OX1BMQVlNT0RFID0gQU5JTUFUSU9OX1BMQVlNT0RFLkxPT1AsIF9wbGF5YmFjazogQU5JTUFUSU9OX1BMQVlCQUNLID0gQU5JTUFUSU9OX1BMQVlCQUNLLlRJTUVCQVNFRF9DT05USU5PVVMpIHtcbiAgICAgIHN1cGVyKCk7XG4gICAgICB0aGlzLmFuaW1hdGlvbiA9IF9hbmltYXRpb247XG4gICAgICB0aGlzLnBsYXltb2RlID0gX3BsYXltb2RlO1xuICAgICAgdGhpcy5wbGF5YmFjayA9IF9wbGF5YmFjaztcblxuICAgICAgdGhpcy5sb2NhbFRpbWUgPSBuZXcgVGltZSgpO1xuXG4gICAgICAvL1RPRE86IHVwZGF0ZSBhbmltYXRpb24gdG90YWwgdGltZSB3aGVuIGxvYWRpbmcgYSBkaWZmZXJlbnQgYW5pbWF0aW9uP1xuICAgICAgdGhpcy5hbmltYXRpb24uY2FsY3VsYXRlVG90YWxUaW1lKCk7XG5cbiAgICAgIExvb3AuYWRkRXZlbnRMaXN0ZW5lcihFVkVOVC5MT09QX0ZSQU1FLCB0aGlzLnVwZGF0ZUFuaW1hdGlvbkxvb3AuYmluZCh0aGlzKSk7XG4gICAgICBUaW1lLmdhbWUuYWRkRXZlbnRMaXN0ZW5lcihFVkVOVC5USU1FX1NDQUxFRCwgdGhpcy51cGRhdGVTY2FsZS5iaW5kKHRoaXMpKTtcbiAgICB9XG5cbiAgICBzZXQgc3BlZWQoX3M6IG51bWJlcikge1xuICAgICAgdGhpcy5zcGVlZFNjYWxlID0gX3M7XG4gICAgICB0aGlzLnVwZGF0ZVNjYWxlKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSnVtcHMgdG8gYSBjZXJ0YWluIHRpbWUgaW4gdGhlIGFuaW1hdGlvbiB0byBwbGF5IGZyb20gdGhlcmUuXG4gICAgICogQHBhcmFtIF90aW1lIFRoZSB0aW1lIHRvIGp1bXAgdG9cbiAgICAgKi9cbiAgICBqdW1wVG8oX3RpbWU6IG51bWJlcik6IHZvaWQge1xuICAgICAgdGhpcy5sb2NhbFRpbWUuc2V0KF90aW1lKTtcbiAgICAgIHRoaXMubGFzdFRpbWUgPSBfdGltZTtcbiAgICAgIF90aW1lID0gX3RpbWUgJSB0aGlzLmFuaW1hdGlvbi50b3RhbFRpbWU7XG4gICAgICBsZXQgbXV0YXRvcjogTXV0YXRvciA9IHRoaXMuYW5pbWF0aW9uLmdldE11dGF0ZWQoX3RpbWUsIHRoaXMuY2FsY3VsYXRlRGlyZWN0aW9uKF90aW1lKSwgdGhpcy5wbGF5YmFjayk7XG4gICAgICB0aGlzLmdldENvbnRhaW5lcigpLmFwcGx5QW5pbWF0aW9uKG11dGF0b3IpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIGN1cnJlbnQgdGltZSBvZiB0aGUgYW5pbWF0aW9uLCBtb2R1bGF0ZWQgZm9yIGFuaW1hdGlvbiBsZW5ndGguXG4gICAgICovXG4gICAgZ2V0Q3VycmVudFRpbWUoKTogbnVtYmVyIHtcbiAgICAgIHJldHVybiB0aGlzLmxvY2FsVGltZS5nZXQoKSAlIHRoaXMuYW5pbWF0aW9uLnRvdGFsVGltZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGb3JjZXMgYW4gdXBkYXRlIG9mIHRoZSBhbmltYXRpb24gZnJvbSBvdXRzaWRlLiBVc2VkIGluIHRoZSBWaWV3QW5pbWF0aW9uLiBTaG91bGRuJ3QgYmUgdXNlZCBkdXJpbmcgdGhlIGdhbWUuXG4gICAgICogQHBhcmFtIF90aW1lIHRoZSAodW5zY2FsZWQpIHRpbWUgdG8gdXBkYXRlIHRoZSBhbmltYXRpb24gd2l0aC5cbiAgICAgKiBAcmV0dXJucyBhIFR1cGVsIGNvbnRhaW5pbmcgdGhlIE11dGF0b3IgZm9yIEFuaW1hdGlvbiBhbmQgdGhlIHBsYXltb2RlIGNvcnJlY3RlZCB0aW1lLiBcbiAgICAgKi9cbiAgICB1cGRhdGVBbmltYXRpb24oX3RpbWU6IG51bWJlcik6IFtNdXRhdG9yLCBudW1iZXJdIHtcbiAgICAgIHJldHVybiB0aGlzLnVwZGF0ZUFuaW1hdGlvbkxvb3AobnVsbCwgX3RpbWUpO1xuICAgIH1cblxuICAgIC8vI3JlZ2lvbiB0cmFuc2ZlclxuICAgIHNlcmlhbGl6ZSgpOiBTZXJpYWxpemF0aW9uIHtcbiAgICAgIGxldCBzOiBTZXJpYWxpemF0aW9uID0gc3VwZXIuc2VyaWFsaXplKCk7XG4gICAgICBzW1wiYW5pbWF0aW9uXCJdID0gdGhpcy5hbmltYXRpb24uc2VyaWFsaXplKCk7XG4gICAgICBzW1wicGxheW1vZGVcIl0gPSB0aGlzLnBsYXltb2RlO1xuICAgICAgc1tcInBsYXliYWNrXCJdID0gdGhpcy5wbGF5YmFjaztcbiAgICAgIHNbXCJzcGVlZFNjYWxlXCJdID0gdGhpcy5zcGVlZFNjYWxlO1xuICAgICAgc1tcInNwZWVkU2NhbGVzV2l0aEdsb2JhbFNwZWVkXCJdID0gdGhpcy5zcGVlZFNjYWxlc1dpdGhHbG9iYWxTcGVlZDtcblxuICAgICAgc1tzdXBlci5jb25zdHJ1Y3Rvci5uYW1lXSA9IHN1cGVyLnNlcmlhbGl6ZSgpO1xuXG4gICAgICByZXR1cm4gcztcbiAgICB9XG5cbiAgICBkZXNlcmlhbGl6ZShfczogU2VyaWFsaXphdGlvbik6IFNlcmlhbGl6YWJsZSB7XG4gICAgICB0aGlzLmFuaW1hdGlvbiA9IG5ldyBBbmltYXRpb24oXCJcIik7XG4gICAgICB0aGlzLmFuaW1hdGlvbi5kZXNlcmlhbGl6ZShfcy5hbmltYXRpb24pO1xuICAgICAgdGhpcy5wbGF5YmFjayA9IF9zLnBsYXliYWNrO1xuICAgICAgdGhpcy5wbGF5bW9kZSA9IF9zLnBsYXltb2RlO1xuICAgICAgdGhpcy5zcGVlZFNjYWxlID0gX3Muc3BlZWRTY2FsZTtcbiAgICAgIHRoaXMuc3BlZWRTY2FsZXNXaXRoR2xvYmFsU3BlZWQgPSBfcy5zcGVlZFNjYWxlc1dpdGhHbG9iYWxTcGVlZDtcblxuICAgICAgc3VwZXIuZGVzZXJpYWxpemUoX3Nbc3VwZXIuY29uc3RydWN0b3IubmFtZV0pO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIC8vI2VuZHJlZ2lvblxuXG4gICAgLy8jcmVnaW9uIHVwZGF0ZUFuaW1hdGlvblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgdGhlIEFuaW1hdGlvbi5cbiAgICAgKiBHZXRzIGNhbGxlZCBldmVyeSB0aW1lIHRoZSBMb29wIGZpcmVzIHRoZSBMT09QX0ZSQU1FIEV2ZW50LlxuICAgICAqIFVzZXMgdGhlIGJ1aWx0LWluIHRpbWUgdW5sZXNzIGEgZGlmZmVyZW50IHRpbWUgaXMgc3BlY2lmaWVkLlxuICAgICAqIE1heSBhbHNvIGJlIGNhbGxlZCBmcm9tIHVwZGF0ZUFuaW1hdGlvbigpLlxuICAgICAqL1xuICAgIHByaXZhdGUgdXBkYXRlQW5pbWF0aW9uTG9vcChfZTogRXZlbnQsIF90aW1lOiBudW1iZXIpOiBbTXV0YXRvciwgbnVtYmVyXSB7XG4gICAgICBpZiAodGhpcy5hbmltYXRpb24udG90YWxUaW1lID09IDApXG4gICAgICAgIHJldHVybiBbbnVsbCwgMF07XG4gICAgICBsZXQgdGltZTogbnVtYmVyID0gX3RpbWUgfHwgdGhpcy5sb2NhbFRpbWUuZ2V0KCk7XG4gICAgICBpZiAodGhpcy5wbGF5YmFjayA9PSBBTklNQVRJT05fUExBWUJBQ0suRlJBTUVCQVNFRCkge1xuICAgICAgICB0aW1lID0gdGhpcy5sYXN0VGltZSArICgxMDAwIC8gdGhpcy5hbmltYXRpb24uZnBzKTtcbiAgICAgIH1cbiAgICAgIGxldCBkaXJlY3Rpb246IG51bWJlciA9IHRoaXMuY2FsY3VsYXRlRGlyZWN0aW9uKHRpbWUpO1xuICAgICAgdGltZSA9IHRoaXMuYXBwbHlQbGF5bW9kZXModGltZSk7XG4gICAgICB0aGlzLmV4ZWN1dGVFdmVudHModGhpcy5hbmltYXRpb24uZ2V0RXZlbnRzVG9GaXJlKHRoaXMubGFzdFRpbWUsIHRpbWUsIHRoaXMucGxheWJhY2ssIGRpcmVjdGlvbikpO1xuXG4gICAgICBpZiAodGhpcy5sYXN0VGltZSAhPSB0aW1lKSB7XG4gICAgICAgIHRoaXMubGFzdFRpbWUgPSB0aW1lO1xuICAgICAgICB0aW1lID0gdGltZSAlIHRoaXMuYW5pbWF0aW9uLnRvdGFsVGltZTtcbiAgICAgICAgbGV0IG11dGF0b3I6IE11dGF0b3IgPSB0aGlzLmFuaW1hdGlvbi5nZXRNdXRhdGVkKHRpbWUsIGRpcmVjdGlvbiwgdGhpcy5wbGF5YmFjayk7XG4gICAgICAgIGlmICh0aGlzLmdldENvbnRhaW5lcigpKSB7XG4gICAgICAgICAgdGhpcy5nZXRDb250YWluZXIoKS5hcHBseUFuaW1hdGlvbihtdXRhdG9yKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gW211dGF0b3IsIHRpbWVdO1xuICAgICAgfVxuICAgICAgcmV0dXJuIFtudWxsLCB0aW1lXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGaXJlcyBhbGwgY3VzdG9tIGV2ZW50cyB0aGUgQW5pbWF0aW9uIHNob3VsZCBoYXZlIGZpcmVkIGJldHdlZW4gdGhlIGxhc3QgZnJhbWUgYW5kIHRoZSBjdXJyZW50IGZyYW1lLlxuICAgICAqIEBwYXJhbSBldmVudHMgYSBsaXN0IG9mIG5hbWVzIG9mIGN1c3RvbSBldmVudHMgdG8gZmlyZVxuICAgICAqL1xuICAgIHByaXZhdGUgZXhlY3V0ZUV2ZW50cyhldmVudHM6IHN0cmluZ1tdKTogdm9pZCB7XG4gICAgICBmb3IgKGxldCBpOiBudW1iZXIgPSAwOyBpIDwgZXZlbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoZXZlbnRzW2ldKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgYWN0dWFsIHRpbWUgdG8gdXNlLCB1c2luZyB0aGUgY3VycmVudCBwbGF5bW9kZXMuXG4gICAgICogQHBhcmFtIF90aW1lIHRoZSB0aW1lIHRvIGFwcGx5IHRoZSBwbGF5bW9kZXMgdG9cbiAgICAgKiBAcmV0dXJucyB0aGUgcmVjYWxjdWxhdGVkIHRpbWVcbiAgICAgKi9cbiAgICBwcml2YXRlIGFwcGx5UGxheW1vZGVzKF90aW1lOiBudW1iZXIpOiBudW1iZXIge1xuICAgICAgc3dpdGNoICh0aGlzLnBsYXltb2RlKSB7XG4gICAgICAgIGNhc2UgQU5JTUFUSU9OX1BMQVlNT0RFLlNUT1A6XG4gICAgICAgICAgcmV0dXJuIHRoaXMubG9jYWxUaW1lLmdldE9mZnNldCgpO1xuICAgICAgICBjYXNlIEFOSU1BVElPTl9QTEFZTU9ERS5QTEFZT05DRTpcbiAgICAgICAgICBpZiAoX3RpbWUgPj0gdGhpcy5hbmltYXRpb24udG90YWxUaW1lKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYW5pbWF0aW9uLnRvdGFsVGltZSAtIDAuMDE7ICAgICAvL1RPRE86IHRoaXMgbWlnaHQgY2F1c2Ugc29tZSBpc3N1ZXNcbiAgICAgICAgICBlbHNlIHJldHVybiBfdGltZTtcbiAgICAgICAgY2FzZSBBTklNQVRJT05fUExBWU1PREUuUExBWU9OQ0VTVE9QQUZURVI6XG4gICAgICAgICAgaWYgKF90aW1lID49IHRoaXMuYW5pbWF0aW9uLnRvdGFsVGltZSlcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFuaW1hdGlvbi50b3RhbFRpbWUgKyAwLjAxOyAgICAgLy9UT0RPOiB0aGlzIG1pZ2h0IGNhdXNlIHNvbWUgaXNzdWVzXG4gICAgICAgICAgZWxzZSByZXR1cm4gX3RpbWU7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgcmV0dXJuIF90aW1lO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgYW5kIHJldHVybnMgdGhlIGRpcmVjdGlvbiB0aGUgYW5pbWF0aW9uIHNob3VsZCBjdXJyZW50bHkgYmUgcGxheWluZyBpbi5cbiAgICAgKiBAcGFyYW0gX3RpbWUgdGhlIHRpbWUgYXQgd2hpY2ggdG8gY2FsY3VsYXRlIHRoZSBkaXJlY3Rpb25cbiAgICAgKiBAcmV0dXJucyAxIGlmIGZvcndhcmQsIDAgaWYgc3RvcCwgLTEgaWYgYmFja3dhcmRzXG4gICAgICovXG4gICAgcHJpdmF0ZSBjYWxjdWxhdGVEaXJlY3Rpb24oX3RpbWU6IG51bWJlcik6IG51bWJlciB7XG4gICAgICBzd2l0Y2ggKHRoaXMucGxheW1vZGUpIHtcbiAgICAgICAgY2FzZSBBTklNQVRJT05fUExBWU1PREUuU1RPUDpcbiAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgLy8gY2FzZSBBTklNQVRJT05fUExBWU1PREUuUElOR1BPTkc6XG4gICAgICAgIC8vICAgaWYgKE1hdGguZmxvb3IoX3RpbWUgLyB0aGlzLmFuaW1hdGlvbi50b3RhbFRpbWUpICUgMiA9PSAwKVxuICAgICAgICAvLyAgICAgcmV0dXJuIDE7XG4gICAgICAgIC8vICAgZWxzZVxuICAgICAgICAvLyAgICAgcmV0dXJuIC0xO1xuICAgICAgICBjYXNlIEFOSU1BVElPTl9QTEFZTU9ERS5SRVZFUlNFTE9PUDpcbiAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgIGNhc2UgQU5JTUFUSU9OX1BMQVlNT0RFLlBMQVlPTkNFOlxuICAgICAgICBjYXNlIEFOSU1BVElPTl9QTEFZTU9ERS5QTEFZT05DRVNUT1BBRlRFUjpcbiAgICAgICAgICBpZiAoX3RpbWUgPj0gdGhpcy5hbmltYXRpb24udG90YWxUaW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICB9XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlcyB0aGUgc2NhbGUgb2YgdGhlIGFuaW1hdGlvbiBpZiB0aGUgdXNlciBjaGFuZ2VzIGl0IG9yIGlmIHRoZSBnbG9iYWwgZ2FtZSB0aW1lciBjaGFuZ2VkIGl0cyBzY2FsZS5cbiAgICAgKi9cbiAgICBwcml2YXRlIHVwZGF0ZVNjYWxlKCk6IHZvaWQge1xuICAgICAgbGV0IG5ld1NjYWxlOiBudW1iZXIgPSB0aGlzLnNwZWVkU2NhbGU7XG4gICAgICBpZiAodGhpcy5zcGVlZFNjYWxlc1dpdGhHbG9iYWxTcGVlZClcbiAgICAgICAgbmV3U2NhbGUgKj0gVGltZS5nYW1lLmdldFNjYWxlKCk7XG4gICAgICB0aGlzLmxvY2FsVGltZS5zZXRTY2FsZShuZXdTY2FsZSk7XG4gICAgfVxuICAgIC8vI2VuZHJlZ2lvblxuICB9XG59IiwibmFtZXNwYWNlIEZ1ZGdlQ29yZSB7XHJcbiAgICAvKipcclxuICAgICAqIEF0dGFjaGVzIGEgW1tDb21wb25lbnRBdWRpb11dIHRvIGEgW1tOb2RlXV0uXHJcbiAgICAgKiBPbmx5IGEgc2luZ2xlIFtbQXVkaW9dXSBjYW4gYmUgdXNlZCB3aXRoaW4gYSBzaW5nbGUgW1tDb21wb25lbnRBdWRpb11dXHJcbiAgICAgKiBAYXV0aG9ycyBUaG9tYXMgRG9ybmVyLCBIRlUsIDIwMTlcclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGNsYXNzIENvbXBvbmVudEF1ZGlvIGV4dGVuZHMgQ29tcG9uZW50IGltcGxlbWVudHMgU2VyaWFsaXphYmxlIHtcclxuICAgICAgICBcclxuICAgICAgICBwdWJsaWMgYXVkaW86IEF1ZGlvIHwgbnVsbDtcclxuICAgICAgICBwdWJsaWMgYXVkaW9Pc2NpbGxhdG9yOiBBdWRpb09zY2lsbGF0b3I7XHJcblxyXG4gICAgICAgIHB1YmxpYyBpc0xvY2FsaXNlZDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIHB1YmxpYyBpc0ZpbHRlcmVkOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAgICAgcHVibGljIGlzRGVsYXllZDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHByb3RlY3RlZCBzaW5nbGV0b246IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBsb2NhbGlzYXRpb246IEF1ZGlvTG9jYWxpc2F0aW9uIHwgbnVsbDtcclxuICAgICAgICBwcml2YXRlIGZpbHRlcjogQXVkaW9GaWx0ZXIgfCBudWxsO1xyXG4gICAgICAgIHByaXZhdGUgZGVsYXk6IEF1ZGlvRGVsYXkgfCBudWxsO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIENyZWF0ZSBDb21wb25lbnQgQXVkaW8gZm9yIFxyXG4gICAgICAgICAqIEBwYXJhbSBfYXVkaW8gXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2F1ZGlvPzogQXVkaW8sIF9hdWRpb09zY2lsbGF0b3I/OiBBdWRpb09zY2lsbGF0b3IpIHtcclxuICAgICAgICAgICAgc3VwZXIoKTtcclxuICAgICAgICAgICAgaWYgKF9hdWRpbykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRBdWRpbyhfYXVkaW8pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBzZXQgQXVkaW9GaWx0ZXIgaW4gQ29tcG9uZW50QXVkaW9cclxuICAgICAgICAgKiBAcGFyYW0gX2ZpbHRlciBBdWRpb0ZpbHRlciBcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgc2V0RmlsdGVyKF9maWx0ZXI6IEF1ZGlvRmlsdGVyKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuZmlsdGVyID0gX2ZpbHRlcjtcclxuICAgICAgICAgICAgdGhpcy5pc0ZpbHRlcmVkID0gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRGaWx0ZXIoKTogQXVkaW9GaWx0ZXIge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5maWx0ZXI7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0RGVsYXkoX2RlbGF5OiBBdWRpb0RlbGF5KTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuZGVsYXkgPSBfZGVsYXk7XHJcbiAgICAgICAgICAgIHRoaXMuaXNEZWxheWVkID0gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXREZWxheSgpOiBBdWRpb0RlbGF5IHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGVsYXk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0TG9jYWxpc2F0aW9uKF9sb2NhbGlzYXRpb246IEF1ZGlvTG9jYWxpc2F0aW9uKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMubG9jYWxpc2F0aW9uID0gX2xvY2FsaXNhdGlvbjtcclxuICAgICAgICAgICAgdGhpcy5pc0xvY2FsaXNlZCA9IHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0TG9jYWxpc2F0aW9uKCk6IEF1ZGlvTG9jYWxpc2F0aW9uIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubG9jYWxpc2F0aW9uO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogUGxheSBBdWRpbyBhdCBjdXJyZW50IHRpbWUgb2YgQXVkaW9Db250ZXh0XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIHBsYXlBdWRpbyhfYXVkaW9TZXR0aW5nczogQXVkaW9TZXR0aW5ncywgX29mZnNldD86IG51bWJlciwgX2R1cmF0aW9uPzogbnVtYmVyKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuYXVkaW8uaW5pdEJ1ZmZlclNvdXJjZShfYXVkaW9TZXR0aW5ncyk7XHJcbiAgICAgICAgICAgIHRoaXMuY29ubmVjdEF1ZGlvTm9kZXMoX2F1ZGlvU2V0dGluZ3MpO1xyXG4gICAgICAgICAgICB0aGlzLmF1ZGlvLmdldEJ1ZmZlclNvdXJjZU5vZGUoKS5zdGFydChfYXVkaW9TZXR0aW5ncy5nZXRBdWRpb0NvbnRleHQoKS5jdXJyZW50VGltZSwgX29mZnNldCwgX2R1cmF0aW9uKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEFkZHMgYW4gW1tBdWRpb11dIHRvIHRoZSBbW0NvbXBvbmVudEF1ZGlvXV1cclxuICAgICAgICAgKiBAcGFyYW0gX2F1ZGlvIEF1ZGlvIERhdGEgYXMgW1tBdWRpb11dXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIHNldEF1ZGlvKF9hdWRpbzogQXVkaW8pOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5hdWRpbyA9IF9hdWRpbztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRBdWRpbygpOiBBdWRpbyB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmF1ZGlvO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8jcmVnaW9uIFRyYW5zZmVyXHJcbiAgICAgICAgcHVibGljIHNlcmlhbGl6ZSgpOiBTZXJpYWxpemF0aW9uIHtcclxuICAgICAgICAgICAgbGV0IHNlcmlhbGl6YXRpb246IFNlcmlhbGl6YXRpb24gPSB7XHJcbiAgICAgICAgICAgICAgICBpc0ZpbHRlcmVkOiB0aGlzLmlzRmlsdGVyZWQsXHJcbiAgICAgICAgICAgICAgICBpc0RlbGF5ZWQ6IHRoaXMuaXNEZWxheWVkLFxyXG4gICAgICAgICAgICAgICAgaXNMb2NhbGlzZWQ6IHRoaXMuaXNMb2NhbGlzZWQsXHJcbiAgICAgICAgICAgICAgICBhdWRpbzogdGhpcy5hdWRpbyxcclxuICAgICAgICAgICAgICAgIGZpbHRlcjogdGhpcy5maWx0ZXIsXHJcbiAgICAgICAgICAgICAgICBkZWxheTogdGhpcy5kZWxheSxcclxuICAgICAgICAgICAgICAgIGxvY2FsaXNhdGlvbjogdGhpcy5sb2NhbGlzYXRpb25cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgcmV0dXJuIHNlcmlhbGl6YXRpb247XHJcbiAgICAgICAgfVxyXG4gICAgICAgXHJcbiAgICAgICAgcHVibGljIGRlc2VyaWFsaXplKF9zZXJpYWxpemF0aW9uOiBTZXJpYWxpemF0aW9uKTogU2VyaWFsaXphYmxlIHtcclxuICAgICAgICAgICAgdGhpcy5pc0ZpbHRlcmVkID0gX3NlcmlhbGl6YXRpb24uaXNGaWx0ZXJlZDtcclxuICAgICAgICAgICAgdGhpcy5pc0RlbGF5ZWQgPSBfc2VyaWFsaXphdGlvbi5pc0RlbGF5ZWQ7XHJcbiAgICAgICAgICAgIHRoaXMuaXNMb2NhbGlzZWQgPSBfc2VyaWFsaXphdGlvbi5pc0xvY2FsaXNlZDtcclxuICAgICAgICAgICAgdGhpcy5hdWRpbyA9IF9zZXJpYWxpemF0aW9uLmF1ZGlvO1xyXG4gICAgICAgICAgICB0aGlzLmZpbHRlciA9IF9zZXJpYWxpemF0aW9uLmZpbHRlcjtcclxuICAgICAgICAgICAgdGhpcy5kZWxheSA9IF9zZXJpYWxpemF0aW9uLmRlbGF5O1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgcmVkdWNlTXV0YXRvcihfbXV0YXRvcjogTXV0YXRvcik6IHZvaWQge1xyXG4gICAgICAgICAgICBkZWxldGUgdGhpcy5hdWRpbztcclxuICAgICAgICAgICAgZGVsZXRlIHRoaXMuZmlsdGVyO1xyXG4gICAgICAgICAgICBkZWxldGUgdGhpcy5kZWxheTtcclxuICAgICAgICAgICAgZGVsZXRlIHRoaXMubG9jYWxpc2F0aW9uO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogRmluYWwgYXR0YWNobWVudHMgZm9yIHRoZSBBdWRpbyBOb2RlcyBpbiBmb2xsb3dpbmcgb3JkZXIuXHJcbiAgICAgICAgICogVGhpcyBtZXRob2QgbmVlZHMgdG8gYmUgY2FsbGVkIHdoZW5ldmVyIHRoZXJlIGlzIGEgY2hhbmdlIG9mIHBhcnRzIGluIHRoZSBbW0NvbXBvbmVudEF1ZGlvXV0uXHJcbiAgICAgICAgICogMS4gTG9jYWwgR2FpblxyXG4gICAgICAgICAqIDIuIExvY2FsaXNhdGlvblxyXG4gICAgICAgICAqIDMuIEZpbHRlclxyXG4gICAgICAgICAqIDQuIERlbGF5XHJcbiAgICAgICAgICogNS4gTWFzdGVyIEdhaW5cclxuICAgICAgICAgKi9cclxuICAgICAgICAgcHJpdmF0ZSBjb25uZWN0QXVkaW9Ob2RlcyhfYXVkaW9TZXR0aW5nczogQXVkaW9TZXR0aW5ncyk6IHZvaWQge1xyXG4gICAgICAgICAgICBjb25zdCBidWZmZXJTb3VyY2U6IEF1ZGlvQnVmZmVyU291cmNlTm9kZSA9IHRoaXMuYXVkaW8uZ2V0QnVmZmVyU291cmNlTm9kZSgpO1xyXG4gICAgICAgICAgICBjb25zdCBsR2FpbjogR2Fpbk5vZGUgPSB0aGlzLmF1ZGlvLmdldExvY2FsR2FpbigpO1xyXG4gICAgICAgICAgICBsZXQgcGFubmVyOiBQYW5uZXJOb2RlO1xyXG4gICAgICAgICAgICBsZXQgZmlsdDogQmlxdWFkRmlsdGVyTm9kZTtcclxuICAgICAgICAgICAgbGV0IGRlbGF5OiBEZWxheU5vZGU7XHJcbiAgICAgICAgICAgIGNvbnN0IG1HYWluOiBHYWluTm9kZSA9IF9hdWRpb1NldHRpbmdzLm1hc3RlckdhaW47XHJcblxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cIik7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ29ubmVjdGluZyBQcm9wZXJ0aWVzIGZvciBBdWRpb1wiKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCItLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXCIpO1xyXG5cclxuICAgICAgICAgICAgYnVmZmVyU291cmNlLmNvbm5lY3QobEdhaW4pO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuaXNMb2NhbGlzZWQgJiYgdGhpcy5sb2NhbGlzYXRpb24gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDb25uZWN0IExvY2FsaXNhdGlvblwiKTtcclxuICAgICAgICAgICAgICAgIHBhbm5lciA9IHRoaXMubG9jYWxpc2F0aW9uLnBhbm5lck5vZGU7XHJcbiAgICAgICAgICAgICAgICBsR2Fpbi5jb25uZWN0KHBhbm5lcik7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNGaWx0ZXJlZCAmJiB0aGlzLmZpbHRlciAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDb25uZWN0IEZpbHRlclwiKTtcclxuICAgICAgICAgICAgICAgICAgICBmaWx0ID0gdGhpcy5maWx0ZXIuYXVkaW9GaWx0ZXI7XHJcbiAgICAgICAgICAgICAgICAgICAgcGFubmVyLmNvbm5lY3QoZmlsdCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzRGVsYXllZCAmJiB0aGlzLmRlbGF5ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDb25uZWN0IERlbGF5XCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxheSA9IHRoaXMuZGVsYXkuYXVkaW9EZWxheTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsdC5jb25uZWN0KGRlbGF5KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDb25uZWN0IE1hc3RlciBHYWluXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxheS5jb25uZWN0KG1HYWluKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ29ubmVjdCBNYXN0ZXIgR2FpblwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsdC5jb25uZWN0KG1HYWluKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5pc0RlbGF5ZWQgJiYgdGhpcy5kZWxheSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ29ubmVjdCBEZWxheVwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVsYXkgPSB0aGlzLmRlbGF5LmF1ZGlvRGVsYXk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhbm5lci5jb25uZWN0KGRlbGF5KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDb25uZWN0IE1hc3RlciBHYWluXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxheS5jb25uZWN0KG1HYWluKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ29ubmVjdCBNYXN0ZXIgR2FpblwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGFubmVyLmNvbm5lY3QobUdhaW4pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmICh0aGlzLmlzRmlsdGVyZWQgJiYgdGhpcy5maWx0ZXIgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDb25uZWN0IEZpbHRlclwiKTtcclxuICAgICAgICAgICAgICAgIGZpbHQgPSB0aGlzLmZpbHRlci5hdWRpb0ZpbHRlcjtcclxuICAgICAgICAgICAgICAgIGxHYWluLmNvbm5lY3QoZmlsdCk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNEZWxheWVkICYmIHRoaXMuZGVsYXkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ29ubmVjdCBEZWxheVwiKTtcclxuICAgICAgICAgICAgICAgICAgICBkZWxheSA9IHRoaXMuZGVsYXkuYXVkaW9EZWxheTtcclxuICAgICAgICAgICAgICAgICAgICBmaWx0LmNvbm5lY3QoZGVsYXkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ29ubmVjdCBNYXN0ZXIgR2FpblwiKTtcclxuICAgICAgICAgICAgICAgICAgICBkZWxheS5jb25uZWN0KG1HYWluKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ29ubmVjdCBNYXN0ZXIgR2FpblwiKTtcclxuICAgICAgICAgICAgICAgICAgICBmaWx0LmNvbm5lY3QobUdhaW4pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKHRoaXMuaXNEZWxheWVkICYmIHRoaXMuZGVsYXkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDb25uZWN0IERlbGF5XCIpO1xyXG4gICAgICAgICAgICAgICAgZGVsYXkgPSB0aGlzLmRlbGF5LmF1ZGlvRGVsYXk7XHJcbiAgICAgICAgICAgICAgICBsR2Fpbi5jb25uZWN0KGRlbGF5KTtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ29ubmVjdCBNYXN0ZXIgR2FpblwiKTtcclxuICAgICAgICAgICAgICAgIGRlbGF5LmNvbm5lY3QobUdhaW4pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDb25uZWN0IE9ubHkgTWFzdGVyIEdhaW5cIik7XHJcbiAgICAgICAgICAgICAgICBsR2Fpbi5jb25uZWN0KG1HYWluKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEZ1ZGdlQ29yZSB7XHJcbiAgICAvKipcclxuICAgICAqIEF0dGFjaGVzIGFuIFtbQXVkaW9MaXN0ZW5lcl1dIHRvIHRoZSBub2RlXHJcbiAgICAgKiBAYXV0aG9ycyBUaG9tYXMgRG9ybmVyLCBIRlUsIDIwMTlcclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGNsYXNzIENvbXBvbmVudEF1ZGlvTGlzdGVuZXIgZXh0ZW5kcyBDb21wb25lbnQge1xyXG5cclxuICAgICAgICBwcml2YXRlIGF1ZGlvTGlzdGVuZXI6IEF1ZGlvTGlzdGVuZXI7XHJcbiAgICAgICAgcHJpdmF0ZSBwb3NpdGlvbkJhc2U6IFZlY3RvcjM7XHJcbiAgICAgICAgcHJpdmF0ZSBwb3NpdGlvblVQOiBWZWN0b3IzO1xyXG4gICAgICAgIHByaXZhdGUgcG9zaXRpb25GVzogVmVjdG9yMztcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQ29uc3RydWN0b3Igb2YgdGhlIEF1ZGlvTGlzdGVuZXIgY2xhc3NcclxuICAgICAgICAgKiBAcGFyYW0gX2F1ZGlvQ29udGV4dCBBdWRpbyBDb250ZXh0IGZyb20gQXVkaW9TZXNzaW9uRGF0YVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9hdWRpb1NldHRpbmdzOiBBdWRpb1NldHRpbmdzKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKCk7XHJcbiAgICAgICAgICAgIHRoaXMuYXVkaW9MaXN0ZW5lciA9IF9hdWRpb1NldHRpbmdzLmdldEF1ZGlvQ29udGV4dCgpLmxpc3RlbmVyO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHNldEF1ZGlvTGlzdGVuZXIoX2F1ZGlvU2V0dGluZ3M6IEF1ZGlvU2V0dGluZ3MpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5hdWRpb0xpc3RlbmVyID0gX2F1ZGlvU2V0dGluZ3MuZ2V0QXVkaW9Db250ZXh0KCkubGlzdGVuZXI7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0QXVkaW9MaXN0ZW5lcigpOiBBdWRpb0xpc3RlbmVyIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYXVkaW9MaXN0ZW5lcjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFdlIHdpbGwgY2FsbCBzZXRBdWRpb0xpc3RlbmVyUG9zaXRpb24gd2hlbmV2ZXIgdGhlcmUgaXMgYSBuZWVkIHRvIGNoYW5nZSBQb3NpdGlvbnMuXHJcbiAgICAgICAgICogQWxsIHRoZSBwb3NpdGlvbiB2YWx1ZXMgc2hvdWxkIGJlIGlkZW50aWNhbCB0byB0aGUgY3VycmVudCBQb3NpdGlvbiB0aGlzIGlzIGF0dGFjaGVkIHRvLlxyXG4gICAgICAgICAqICAgICAgIFxyXG4gICAgICAgICAqICAgICBfX3xfX19cclxuICAgICAgICAgKiAgICB8ICB8ICB8XHJcbiAgICAgICAgICogICAgfCAgwrAtLXwtLVxyXG4gICAgICAgICAqICAgIHwvX19fX3xcclxuICAgICAgICAgKiAgIC9cclxuICAgICAgICAgKiBcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgc2V0TGlzdGVuZXJQb3NpdGlvbihfcG9zaXRpb246IFZlY3RvcjMpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5wb3NpdGlvbkJhc2UgPSBfcG9zaXRpb247XHJcblxyXG4gICAgICAgICAgICB0aGlzLmF1ZGlvTGlzdGVuZXIucG9zaXRpb25YLnZhbHVlID0gdGhpcy5wb3NpdGlvbkJhc2UueDtcclxuICAgICAgICAgICAgdGhpcy5hdWRpb0xpc3RlbmVyLnBvc2l0aW9uWS52YWx1ZSA9IC10aGlzLnBvc2l0aW9uQmFzZS56O1xyXG4gICAgICAgICAgICB0aGlzLmF1ZGlvTGlzdGVuZXIucG9zaXRpb25aLnZhbHVlID0gdGhpcy5wb3NpdGlvbkJhc2UueTtcclxuXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiU2V0IExpc3RlbmVyIFBvc2l0aW9uOiBYOiBcIiArIHRoaXMuYXVkaW9MaXN0ZW5lci5wb3NpdGlvblgudmFsdWUgKyBcIiB8IFk6IFwiICsgdGhpcy5hdWRpb0xpc3RlbmVyLnBvc2l0aW9uWS52YWx1ZSArIFwiIHwgWjogXCIgKyB0aGlzLmF1ZGlvTGlzdGVuZXIucG9zaXRpb25aLnZhbHVlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRMaXN0ZW5lclBvc2l0aW9uKCk6IFZlY3RvcjMge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wb3NpdGlvbkJhc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBGVURHRSBTWVNURU1cclxuICAgICAgICAgKiBcclxuICAgICAgICAgKiAgICAgIFVQIChZKVxyXG4gICAgICAgICAqICAgICAgIF5cclxuICAgICAgICAgKiAgICAgX198X19fXHJcbiAgICAgICAgICogICAgfCAgfCAgfFxyXG4gICAgICAgICAqICAgIHwgIE8tLXwtLT4gRk9SV0FSRCAoWilcclxuICAgICAgICAgKiAgICB8X19fX198XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIHNldExpc3RlbmVyUG9zaXRpb25Gb3J3YXJkKF9wb3NpdGlvbjogVmVjdG9yMyk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLnBvc2l0aW9uRlcgPSBfcG9zaXRpb247XHJcbiAgICAgICAgICAgIC8vU2V0IGZvcndhcmQgbG9va2luZyBwb3NpdGlvbiBvZiB0aGUgQXVkaW9MaXN0ZW5lclxyXG4gICAgICAgICAgICB0aGlzLmF1ZGlvTGlzdGVuZXIuZm9yd2FyZFgudmFsdWUgPSB0aGlzLnBvc2l0aW9uRlcueDtcclxuICAgICAgICAgICAgdGhpcy5hdWRpb0xpc3RlbmVyLmZvcndhcmRZLnZhbHVlID0gLXRoaXMucG9zaXRpb25GVy56ICsgMTtcclxuICAgICAgICAgICAgdGhpcy5hdWRpb0xpc3RlbmVyLmZvcndhcmRaLnZhbHVlID0gdGhpcy5wb3NpdGlvbkZXLnk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0TGlzdGVuZXJQb3NpdGlvbkZvcndhcmQoKTogVmVjdG9yMyB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBvc2l0aW9uRlc7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiAgICAgIFVQIChaKVxyXG4gICAgICAgICAqICAgICAgIF5cclxuICAgICAgICAgKiAgICAgX198X19fXHJcbiAgICAgICAgICogICAgfCAgfCAgfFxyXG4gICAgICAgICAqICAgIHwgIE8tLXwtLT4gRk9SV0FSRCAoWClcclxuICAgICAgICAgKiAgICB8X19fX198XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIHNldExpc3RlbmVyUG9zdGl0aW9uVXAoX3Bvc2l0aW9uOiBWZWN0b3IzKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb25VUCA9IF9wb3NpdGlvbjtcclxuICAgICAgICAgICAgLy9TZXQgdXB3YXJkIGxvb2tpbmcgcG9zaXRpb24gb2YgdGhlIEF1ZGlvTGlzdGVuZXJcclxuICAgICAgICAgICAgdGhpcy5hdWRpb0xpc3RlbmVyLnVwWC52YWx1ZSA9IHRoaXMucG9zaXRpb25VUC54O1xyXG4gICAgICAgICAgICB0aGlzLmF1ZGlvTGlzdGVuZXIudXBZLnZhbHVlID0gLXRoaXMucG9zaXRpb25VUC56O1xyXG4gICAgICAgICAgICB0aGlzLmF1ZGlvTGlzdGVuZXIudXBaLnZhbHVlID0gdGhpcy5wb3NpdGlvblVQLnkgKyAxO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldExpc3RlbmVyUG9zaXRpb25VcCgpOiBWZWN0b3IzIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMucG9zaXRpb25VUDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFNldCBhbGwgcG9zaXRpb25hbCBWYWx1ZXMgYmFzZWQgb24gYSBzaW5nbGUgUG9zaXRpb25cclxuICAgICAgICAgKiBAcGFyYW0gX3Bvc2l0aW9uIHBvc2l0aW9uIG9mIHRoZSBPYmplY3RcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgdXBkYXRlUG9zaXRpb25zKF9wb3NpdGlvbjogVmVjdG9yMy8qLCBfcG9zaXRpb25Gb3J3YXJkOiBWZWN0b3IzLCBfcG9zaXRpb25VcDogVmVjdG9yMyovKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0TGlzdGVuZXJQb3NpdGlvbihfcG9zaXRpb24pO1xyXG4gICAgICAgICAgICB0aGlzLnNldExpc3RlbmVyUG9zaXRpb25Gb3J3YXJkKF9wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0TGlzdGVuZXJQb3N0aXRpb25VcChfcG9zaXRpb24pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogU2hvdyBhbGwgU2V0dGluZ3MgaW5zaWRlIG9mIFtbQ29tcG9uZW50QXVkaW9MaXN0ZW5lcl1dLlxyXG4gICAgICAgICAqIE1ldGhvZCBvbmx5IGZvciBEZWJ1Z2dpbmcgUHVycG9zZXMuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIHNob3dMaXN0ZW5lclNldHRpbmdzKCk6IHZvaWQge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVwiKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJTaG93IGFsbCBTZXR0aW5ncyBvZiBMaXN0ZW5lclwiKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCItLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cIik7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiTGlzdGVuZXIgUG9zaXRpb24gQmFzZTogWDogXCIgKyB0aGlzLmF1ZGlvTGlzdGVuZXIucG9zaXRpb25YLnZhbHVlICsgXCIgfCBZOiBcIiArIHRoaXMuYXVkaW9MaXN0ZW5lci5wb3NpdGlvblkudmFsdWUgKyBcIiB8IFo6IFwiICsgdGhpcy5hdWRpb0xpc3RlbmVyLnBvc2l0aW9uWi52YWx1ZSk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiTGlzdGVuZXIgUG9zaXRpb24gVXA6IFg6IFwiICsgdGhpcy5hdWRpb0xpc3RlbmVyLnVwWC52YWx1ZSArIFwiIHwgWTogXCIgKyB0aGlzLmF1ZGlvTGlzdGVuZXIudXBZLnZhbHVlICsgXCIgfCBaOiBcIiArIHRoaXMuYXVkaW9MaXN0ZW5lci51cFoudmFsdWUpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkxpc3RlbmVyIFBvc2l0aW9uIEZvcndhcmQ6IFg6IFwiICsgdGhpcy5hdWRpb0xpc3RlbmVyLmZvcndhcmRYLnZhbHVlICsgXCIgfCBZOiBcIiArIHRoaXMuYXVkaW9MaXN0ZW5lci5mb3J3YXJkWS52YWx1ZSArIFwiIHwgWjogXCIgKyB0aGlzLmF1ZGlvTGlzdGVuZXIuZm9yd2FyZFoudmFsdWUpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVwiKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vI3JlZ2lvbiBUcmFuc2ZlclxyXG4gICAgICAgIHB1YmxpYyBzZXJpYWxpemUoKTogU2VyaWFsaXphdGlvbiB7XHJcbiAgICAgICAgICAgIGxldCBzZXJpYWxpemF0aW9uOiBTZXJpYWxpemF0aW9uID0ge1xyXG4gICAgICAgICAgICAgICAgYXVkaW9MaXN0ZW5lcjogdGhpcy5hdWRpb0xpc3RlbmVyLFxyXG4gICAgICAgICAgICAgICAgcG9zQmFzZTogdGhpcy5wb3NpdGlvbkJhc2UsXHJcbiAgICAgICAgICAgICAgICBwb3NGVzogdGhpcy5wb3NpdGlvbkZXLFxyXG4gICAgICAgICAgICAgICAgcG9zVVA6IHRoaXMucG9zaXRpb25VUFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICByZXR1cm4gc2VyaWFsaXphdGlvbjtcclxuICAgICAgICB9XHJcbiAgICAgICBcclxuICAgICAgICBwdWJsaWMgZGVzZXJpYWxpemUoX3NlcmlhbGl6YXRpb246IFNlcmlhbGl6YXRpb24pOiBTZXJpYWxpemFibGUge1xyXG4gICAgICAgICAgICB0aGlzLmF1ZGlvTGlzdGVuZXIgPSBfc2VyaWFsaXphdGlvbi5hdWRpb0xpc3RlbmVyO1xyXG4gICAgICAgICAgICB0aGlzLnBvc2l0aW9uQmFzZSA9IF9zZXJpYWxpemF0aW9uLnBvc0Jhc2U7XHJcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb25GVyA9IF9zZXJpYWxpemF0aW9uLnBvc0ZXO1xyXG4gICAgICAgICAgICB0aGlzLnBvc2l0aW9uVVAgPSBfc2VyaWFsaXphdGlvbi5wb3NVUDtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIHJlZHVjZU11dGF0b3IoX211dGF0b3I6IE11dGF0b3IpOiB2b2lkIHtcclxuICAgICAgICAgICAgZGVsZXRlIHRoaXMuYXVkaW9MaXN0ZW5lcjtcclxuICAgICAgICAgICAgZGVsZXRlIHRoaXMucG9zaXRpb25CYXNlO1xyXG4gICAgICAgICAgICBkZWxldGUgdGhpcy5wb3NpdGlvbkZXO1xyXG4gICAgICAgICAgICBkZWxldGUgdGhpcy5wb3NpdGlvblVQO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyNlbmRyZWdpb25cclxuICAgIH1cclxufVxyXG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiQ29tcG9uZW50LnRzXCIvPlxubmFtZXNwYWNlIEZ1ZGdlQ29yZSB7XG4gICAgZXhwb3J0IGVudW0gRklFTERfT0ZfVklFVyB7XG4gICAgICAgIEhPUklaT05UQUwsIFZFUlRJQ0FMLCBESUFHT05BTFxuICAgIH1cbiAgICAvKipcbiAgICAgKiBEZWZpbmVzIGlkZW50aWZpZXJzIGZvciB0aGUgdmFyaW91cyBwcm9qZWN0aW9ucyBhIGNhbWVyYSBjYW4gcHJvdmlkZS4gIFxuICAgICAqIFRPRE86IGNoYW5nZSBiYWNrIHRvIG51bWJlciBlbnVtIGlmIHN0cmluZ3Mgbm90IG5lZWRlZFxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFBST0pFQ1RJT04ge1xuICAgICAgICBDRU5UUkFMID0gXCJjZW50cmFsXCIsXG4gICAgICAgIE9SVEhPR1JBUEhJQyA9IFwib3J0aG9ncmFwaGljXCIsXG4gICAgICAgIERJTUVUUklDID0gXCJkaW1ldHJpY1wiLFxuICAgICAgICBTVEVSRU8gPSBcInN0ZXJlb1wiXG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRoZSBjYW1lcmEgY29tcG9uZW50IGhvbGRzIHRoZSBwcm9qZWN0aW9uLW1hdHJpeCBhbmQgb3RoZXIgZGF0YSBuZWVkZWQgdG8gcmVuZGVyIGEgc2NlbmUgZnJvbSB0aGUgcGVyc3BlY3RpdmUgb2YgdGhlIG5vZGUgaXQgaXMgYXR0YWNoZWQgdG8uXG4gICAgICogQGF1dGhvcnMgSmFzY2hhIEthcmFnw7ZsLCBIRlUsIDIwMTkgfCBKaXJrYSBEZWxsJ09yby1GcmllZGwsIEhGVSwgMjAxOVxuICAgICAqL1xuICAgIGV4cG9ydCBjbGFzcyBDb21wb25lbnRDYW1lcmEgZXh0ZW5kcyBDb21wb25lbnQge1xuICAgICAgICBwdWJsaWMgcGl2b3Q6IE1hdHJpeDR4NCA9IE1hdHJpeDR4NC5JREVOVElUWTtcbiAgICAgICAgLy9wcml2YXRlIG9ydGhvZ3JhcGhpYzogYm9vbGVhbiA9IGZhbHNlOyAvLyBEZXRlcm1pbmVzIHdoZXRoZXIgdGhlIGltYWdlIHdpbGwgYmUgcmVuZGVyZWQgd2l0aCBwZXJzcGVjdGl2ZSBvciBvcnRob2dyYXBoaWMgcHJvamVjdGlvbi5cbiAgICAgICAgcHJpdmF0ZSBwcm9qZWN0aW9uOiBQUk9KRUNUSU9OID0gUFJPSkVDVElPTi5DRU5UUkFMO1xuICAgICAgICBwcml2YXRlIHRyYW5zZm9ybTogTWF0cml4NHg0ID0gbmV3IE1hdHJpeDR4NDsgLy8gVGhlIG1hdHJpeCB0byBtdWx0aXBseSBlYWNoIHNjZW5lIG9iamVjdHMgdHJhbnNmb3JtYXRpb24gYnksIHRvIGRldGVybWluZSB3aGVyZSBpdCB3aWxsIGJlIGRyYXduLlxuICAgICAgICBwcml2YXRlIGZpZWxkT2ZWaWV3OiBudW1iZXIgPSA0NTsgLy8gVGhlIGNhbWVyYSdzIHNlbnNvcmFuZ2xlLlxuICAgICAgICBwcml2YXRlIGFzcGVjdFJhdGlvOiBudW1iZXIgPSAxLjA7XG4gICAgICAgIHByaXZhdGUgZGlyZWN0aW9uOiBGSUVMRF9PRl9WSUVXID0gRklFTERfT0ZfVklFVy5ESUFHT05BTDtcbiAgICAgICAgcHJpdmF0ZSBiYWNrZ3JvdW5kQ29sb3I6IENvbG9yID0gbmV3IENvbG9yKDAsIDAsIDAsIDEpOyAvLyBUaGUgY29sb3Igb2YgdGhlIGJhY2tncm91bmQgdGhlIGNhbWVyYSB3aWxsIHJlbmRlci5cbiAgICAgICAgcHJpdmF0ZSBiYWNrZ3JvdW5kRW5hYmxlZDogYm9vbGVhbiA9IHRydWU7IC8vIERldGVybWluZXMgd2hldGhlciBvciBub3QgdGhlIGJhY2tncm91bmQgb2YgdGhpcyBjYW1lcmEgd2lsbCBiZSByZW5kZXJlZC5cbiAgICAgICAgLy8gVE9ETzogZXhhbWluZSwgaWYgYmFja2dyb3VuZCBzaG91bGQgYmUgYW4gYXR0cmlidXRlIG9mIENhbWVyYSBvciBWaWV3cG9ydFxuXG4gICAgICAgIHB1YmxpYyBnZXRQcm9qZWN0aW9uKCk6IFBST0pFQ1RJT04ge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucHJvamVjdGlvbjtcbiAgICAgICAgfVxuXG4gICAgICAgIHB1YmxpYyBnZXRCYWNrZ291bmRDb2xvcigpOiBDb2xvciB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5iYWNrZ3JvdW5kQ29sb3I7XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgZ2V0QmFja2dyb3VuZEVuYWJsZWQoKTogYm9vbGVhbiB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5iYWNrZ3JvdW5kRW5hYmxlZDtcbiAgICAgICAgfVxuXG4gICAgICAgIHB1YmxpYyBnZXRBc3BlY3QoKTogbnVtYmVyIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFzcGVjdFJhdGlvO1xuICAgICAgICB9XG5cbiAgICAgICAgcHVibGljIGdldEZpZWxkT2ZWaWV3KCk6IG51bWJlciB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5maWVsZE9mVmlldztcbiAgICAgICAgfVxuXG4gICAgICAgIHB1YmxpYyBnZXREaXJlY3Rpb24oKTogRklFTERfT0ZfVklFVyB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5kaXJlY3Rpb247XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogUmV0dXJucyB0aGUgbXVsdGlwbGlrYXRpb24gb2YgdGhlIHdvcmxkdHJhbnNmb3JtYXRpb24gb2YgdGhlIGNhbWVyYSBjb250YWluZXIgd2l0aCB0aGUgcHJvamVjdGlvbiBtYXRyaXhcbiAgICAgICAgICogQHJldHVybnMgdGhlIHdvcmxkLXByb2plY3Rpb24tbWF0cml4XG4gICAgICAgICAqL1xuICAgICAgICBwdWJsaWMgZ2V0IFZpZXdQcm9qZWN0aW9uTWF0cml4KCk6IE1hdHJpeDR4NCB7XG4gICAgICAgICAgICBsZXQgd29ybGQ6IE1hdHJpeDR4NCA9IHRoaXMucGl2b3Q7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHdvcmxkID0gTWF0cml4NHg0Lk1VTFRJUExJQ0FUSU9OKHRoaXMuZ2V0Q29udGFpbmVyKCkubXR4V29ybGQsIHRoaXMucGl2b3QpO1xuICAgICAgICAgICAgfSBjYXRjaCAoX2Vycm9yKSB7XG4gICAgICAgICAgICAgICAgLy8gbm8gY29udGFpbmVyIG5vZGUgb3Igbm8gd29ybGQgdHJhbnNmb3JtYXRpb24gZm91bmQgLT4gY29udGludWUgd2l0aCBwaXZvdCBvbmx5XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsZXQgdmlld01hdHJpeDogTWF0cml4NHg0ID0gTWF0cml4NHg0LklOVkVSU0lPTih3b3JsZCk7IFxuICAgICAgICAgICAgcmV0dXJuIE1hdHJpeDR4NC5NVUxUSVBMSUNBVElPTih0aGlzLnRyYW5zZm9ybSwgdmlld01hdHJpeCk7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogU2V0IHRoZSBjYW1lcmEgdG8gcGVyc3BlY3RpdmUgcHJvamVjdGlvbi4gVGhlIHdvcmxkIG9yaWdpbiBpcyBpbiB0aGUgY2VudGVyIG9mIHRoZSBjYW52YXNlbGVtZW50LlxuICAgICAgICAgKiBAcGFyYW0gX2FzcGVjdCBUaGUgYXNwZWN0IHJhdGlvIGJldHdlZW4gd2lkdGggYW5kIGhlaWdodCBvZiBwcm9qZWN0aW9uc3BhY2UuKERlZmF1bHQgPSBjYW52YXMuY2xpZW50V2lkdGggLyBjYW52YXMuQ2xpZW50SGVpZ2h0KVxuICAgICAgICAgKiBAcGFyYW0gX2ZpZWxkT2ZWaWV3IFRoZSBmaWVsZCBvZiB2aWV3IGluIERlZ3JlZXMuIChEZWZhdWx0ID0gNDUpXG4gICAgICAgICAqIEBwYXJhbSBfZGlyZWN0aW9uIFRoZSBwbGFuZSBvbiB3aGljaCB0aGUgZmllbGRPZlZpZXctQW5nbGUgaXMgZ2l2ZW4gXG4gICAgICAgICAqL1xuICAgICAgICBwdWJsaWMgcHJvamVjdENlbnRyYWwoX2FzcGVjdDogbnVtYmVyID0gdGhpcy5hc3BlY3RSYXRpbywgX2ZpZWxkT2ZWaWV3OiBudW1iZXIgPSB0aGlzLmZpZWxkT2ZWaWV3LCBfZGlyZWN0aW9uOiBGSUVMRF9PRl9WSUVXID0gdGhpcy5kaXJlY3Rpb24pOiB2b2lkIHtcbiAgICAgICAgICAgIHRoaXMuYXNwZWN0UmF0aW8gPSBfYXNwZWN0O1xuICAgICAgICAgICAgdGhpcy5maWVsZE9mVmlldyA9IF9maWVsZE9mVmlldztcbiAgICAgICAgICAgIHRoaXMuZGlyZWN0aW9uID0gX2RpcmVjdGlvbjtcbiAgICAgICAgICAgIHRoaXMucHJvamVjdGlvbiA9IFBST0pFQ1RJT04uQ0VOVFJBTDtcbiAgICAgICAgICAgIHRoaXMudHJhbnNmb3JtID0gTWF0cml4NHg0LlBST0pFQ1RJT05fQ0VOVFJBTChfYXNwZWN0LCB0aGlzLmZpZWxkT2ZWaWV3LCAxLCAyMDAwLCB0aGlzLmRpcmVjdGlvbik7IC8vIFRPRE86IHJlbW92ZSBtYWdpYyBudW1iZXJzXG4gICAgICAgIH1cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNldCB0aGUgY2FtZXJhIHRvIG9ydGhvZ3JhcGhpYyBwcm9qZWN0aW9uLiBUaGUgb3JpZ2luIGlzIGluIHRoZSB0b3AgbGVmdCBjb3JuZXIgb2YgdGhlIGNhbnZhcy5cbiAgICAgICAgICogQHBhcmFtIF9sZWZ0IFRoZSBwb3NpdGlvbnZhbHVlIG9mIHRoZSBwcm9qZWN0aW9uc3BhY2UncyBsZWZ0IGJvcmRlci4gKERlZmF1bHQgPSAwKVxuICAgICAgICAgKiBAcGFyYW0gX3JpZ2h0IFRoZSBwb3NpdGlvbnZhbHVlIG9mIHRoZSBwcm9qZWN0aW9uc3BhY2UncyByaWdodCBib3JkZXIuIChEZWZhdWx0ID0gY2FudmFzLmNsaWVudFdpZHRoKVxuICAgICAgICAgKiBAcGFyYW0gX2JvdHRvbSBUaGUgcG9zaXRpb252YWx1ZSBvZiB0aGUgcHJvamVjdGlvbnNwYWNlJ3MgYm90dG9tIGJvcmRlci4oRGVmYXVsdCA9IGNhbnZhcy5jbGllbnRIZWlnaHQpXG4gICAgICAgICAqIEBwYXJhbSBfdG9wIFRoZSBwb3NpdGlvbnZhbHVlIG9mIHRoZSBwcm9qZWN0aW9uc3BhY2UncyB0b3AgYm9yZGVyLihEZWZhdWx0ID0gMClcbiAgICAgICAgICovXG4gICAgICAgIHB1YmxpYyBwcm9qZWN0T3J0aG9ncmFwaGljKF9sZWZ0OiBudW1iZXIgPSAwLCBfcmlnaHQ6IG51bWJlciA9IFJlbmRlck1hbmFnZXIuZ2V0Q2FudmFzKCkuY2xpZW50V2lkdGgsIF9ib3R0b206IG51bWJlciA9IFJlbmRlck1hbmFnZXIuZ2V0Q2FudmFzKCkuY2xpZW50SGVpZ2h0LCBfdG9wOiBudW1iZXIgPSAwKTogdm9pZCB7XG4gICAgICAgICAgICB0aGlzLnByb2plY3Rpb24gPSBQUk9KRUNUSU9OLk9SVEhPR1JBUEhJQztcbiAgICAgICAgICAgIHRoaXMudHJhbnNmb3JtID0gTWF0cml4NHg0LlBST0pFQ1RJT05fT1JUSE9HUkFQSElDKF9sZWZ0LCBfcmlnaHQsIF9ib3R0b20sIF90b3AsIDQwMCwgLTQwMCk7IC8vIFRPRE86IGV4YW1pbmUgbWFnaWMgbnVtYmVycyFcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZXR1cm4gdGhlIGNhbGN1bGF0ZWQgbm9ybWVkIGRpbWVuc2lvbiBvZiB0aGUgcHJvamVjdGlvbiBzcGFjZVxuICAgICAgICAgKi9cbiAgICAgICAgcHVibGljIGdldFByb2plY3Rpb25SZWN0YW5nbGUoKTogUmVjdGFuZ2xlIHtcbiAgICAgICAgICAgIGxldCB0YW5Gb3Y6IG51bWJlciA9IE1hdGgudGFuKE1hdGguUEkgKiB0aGlzLmZpZWxkT2ZWaWV3IC8gMzYwKTsgLy8gSGFsZiBvZiB0aGUgYW5nbGUsIHRvIGNhbGN1bGF0ZSBkaW1lbnNpb24gZnJvbSB0aGUgY2VudGVyIC0+IHJpZ2h0IGFuZ2xlXG4gICAgICAgICAgICBsZXQgdGFuSG9yaXpvbnRhbDogbnVtYmVyID0gMDtcbiAgICAgICAgICAgIGxldCB0YW5WZXJ0aWNhbDogbnVtYmVyID0gMDtcblxuICAgICAgICAgICAgaWYgKHRoaXMuZGlyZWN0aW9uID09IEZJRUxEX09GX1ZJRVcuRElBR09OQUwpIHtcbiAgICAgICAgICAgICAgICBsZXQgYXNwZWN0OiBudW1iZXIgPSBNYXRoLnNxcnQodGhpcy5hc3BlY3RSYXRpbyk7XG4gICAgICAgICAgICAgICAgdGFuSG9yaXpvbnRhbCA9IHRhbkZvdiAqIGFzcGVjdDtcbiAgICAgICAgICAgICAgICB0YW5WZXJ0aWNhbCA9IHRhbkZvdiAvIGFzcGVjdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHRoaXMuZGlyZWN0aW9uID09IEZJRUxEX09GX1ZJRVcuVkVSVElDQUwpIHtcbiAgICAgICAgICAgICAgICB0YW5WZXJ0aWNhbCA9IHRhbkZvdjtcbiAgICAgICAgICAgICAgICB0YW5Ib3Jpem9udGFsID0gdGFuVmVydGljYWwgKiB0aGlzLmFzcGVjdFJhdGlvO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7Ly9GT1ZfRElSRUNUSU9OLkhPUklaT05UQUxcbiAgICAgICAgICAgICAgICB0YW5Ib3Jpem9udGFsID0gdGFuRm92O1xuICAgICAgICAgICAgICAgIHRhblZlcnRpY2FsID0gdGFuSG9yaXpvbnRhbCAvIHRoaXMuYXNwZWN0UmF0aW87XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBSZWN0YW5nbGUuR0VUKDAsIDAsIHRhbkhvcml6b250YWwgKiAyLCB0YW5WZXJ0aWNhbCAqIDIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8jcmVnaW9uIFRyYW5zZmVyXG4gICAgICAgIHB1YmxpYyBzZXJpYWxpemUoKTogU2VyaWFsaXphdGlvbiB7XG4gICAgICAgICAgICBsZXQgc2VyaWFsaXphdGlvbjogU2VyaWFsaXphdGlvbiA9IHtcbiAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IHRoaXMuYmFja2dyb3VuZENvbG9yLFxuICAgICAgICAgICAgICAgIGJhY2tncm91bmRFbmFibGVkOiB0aGlzLmJhY2tncm91bmRFbmFibGVkLFxuICAgICAgICAgICAgICAgIHByb2plY3Rpb246IHRoaXMucHJvamVjdGlvbixcbiAgICAgICAgICAgICAgICBmaWVsZE9mVmlldzogdGhpcy5maWVsZE9mVmlldyxcbiAgICAgICAgICAgICAgICBkaXJlY3Rpb246IHRoaXMuZGlyZWN0aW9uLFxuICAgICAgICAgICAgICAgIGFzcGVjdDogdGhpcy5hc3BlY3RSYXRpbyxcbiAgICAgICAgICAgICAgICBwaXZvdDogdGhpcy5waXZvdC5zZXJpYWxpemUoKSxcbiAgICAgICAgICAgICAgICBbc3VwZXIuY29uc3RydWN0b3IubmFtZV06IHN1cGVyLnNlcmlhbGl6ZSgpXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuIHNlcmlhbGl6YXRpb247XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgZGVzZXJpYWxpemUoX3NlcmlhbGl6YXRpb246IFNlcmlhbGl6YXRpb24pOiBTZXJpYWxpemFibGUge1xuICAgICAgICAgICAgdGhpcy5iYWNrZ3JvdW5kQ29sb3IgPSBfc2VyaWFsaXphdGlvbi5iYWNrZ3JvdW5kQ29sb3I7XG4gICAgICAgICAgICB0aGlzLmJhY2tncm91bmRFbmFibGVkID0gX3NlcmlhbGl6YXRpb24uYmFja2dyb3VuZEVuYWJsZWQ7XG4gICAgICAgICAgICB0aGlzLnByb2plY3Rpb24gPSBfc2VyaWFsaXphdGlvbi5wcm9qZWN0aW9uO1xuICAgICAgICAgICAgdGhpcy5maWVsZE9mVmlldyA9IF9zZXJpYWxpemF0aW9uLmZpZWxkT2ZWaWV3O1xuICAgICAgICAgICAgdGhpcy5hc3BlY3RSYXRpbyA9IF9zZXJpYWxpemF0aW9uLmFzcGVjdDtcbiAgICAgICAgICAgIHRoaXMuZGlyZWN0aW9uID0gX3NlcmlhbGl6YXRpb24uZGlyZWN0aW9uO1xuICAgICAgICAgICAgdGhpcy5waXZvdC5kZXNlcmlhbGl6ZShfc2VyaWFsaXphdGlvbi5waXZvdCk7XG4gICAgICAgICAgICBzdXBlci5kZXNlcmlhbGl6ZShfc2VyaWFsaXphdGlvbltzdXBlci5jb25zdHJ1Y3Rvci5uYW1lXSk7XG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMucHJvamVjdGlvbikge1xuICAgICAgICAgICAgICAgIGNhc2UgUFJPSkVDVElPTi5PUlRIT0dSQVBISUM6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHJvamVjdE9ydGhvZ3JhcGhpYygpOyAvLyBUT0RPOiBzZXJpYWxpemUgYW5kIGRlc2VyaWFsaXplIHBhcmFtZXRlcnNcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBQUk9KRUNUSU9OLkNFTlRSQUw6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHJvamVjdENlbnRyYWwoKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIHB1YmxpYyBnZXRNdXRhdG9yQXR0cmlidXRlVHlwZXMoX211dGF0b3I6IE11dGF0b3IpOiBNdXRhdG9yQXR0cmlidXRlVHlwZXMge1xuICAgICAgICAgICAgbGV0IHR5cGVzOiBNdXRhdG9yQXR0cmlidXRlVHlwZXMgPSBzdXBlci5nZXRNdXRhdG9yQXR0cmlidXRlVHlwZXMoX211dGF0b3IpO1xuICAgICAgICAgICAgaWYgKHR5cGVzLmRpcmVjdGlvbilcbiAgICAgICAgICAgICAgICB0eXBlcy5kaXJlY3Rpb24gPSBGSUVMRF9PRl9WSUVXO1xuICAgICAgICAgICAgaWYgKHR5cGVzLnByb2plY3Rpb24pXG4gICAgICAgICAgICAgICAgdHlwZXMucHJvamVjdGlvbiA9IFBST0pFQ1RJT047XG4gICAgICAgICAgICByZXR1cm4gdHlwZXM7XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgbXV0YXRlKF9tdXRhdG9yOiBNdXRhdG9yKTogdm9pZCB7XG4gICAgICAgICAgICBzdXBlci5tdXRhdGUoX211dGF0b3IpO1xuXG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMucHJvamVjdGlvbikge1xuICAgICAgICAgICAgICAgIGNhc2UgUFJPSkVDVElPTi5DRU5UUkFMOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLnByb2plY3RDZW50cmFsKHRoaXMuYXNwZWN0UmF0aW8sIHRoaXMuZmllbGRPZlZpZXcsIHRoaXMuZGlyZWN0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBwcm90ZWN0ZWQgcmVkdWNlTXV0YXRvcihfbXV0YXRvcjogTXV0YXRvcik6IHZvaWQge1xuICAgICAgICAgICAgZGVsZXRlIF9tdXRhdG9yLnRyYW5zZm9ybTtcbiAgICAgICAgICAgIHN1cGVyLnJlZHVjZU11dGF0b3IoX211dGF0b3IpO1xuICAgICAgICB9XG4gICAgICAgIC8vI2VuZHJlZ2lvblxuICAgIH1cbn0iLCJuYW1lc3BhY2UgRnVkZ2VDb3JlIHtcbiAgICAvKipcbiAgICAgKiBCYXNlY2xhc3MgZm9yIGRpZmZlcmVudCBraW5kcyBvZiBsaWdodHMuIFxuICAgICAqIEBhdXRob3JzIEppcmthIERlbGwnT3JvLUZyaWVkbCwgSEZVLCAyMDE5XG4gICAgICovXG4gICAgZXhwb3J0IGFic3RyYWN0IGNsYXNzIExpZ2h0IGV4dGVuZHMgTXV0YWJsZSB7XG4gICAgICAgIHB1YmxpYyBjb2xvcjogQ29sb3I7XG4gICAgICAgIGNvbnN0cnVjdG9yKF9jb2xvcjogQ29sb3IgPSBuZXcgQ29sb3IoMSwgMSwgMSwgMSkpIHtcbiAgICAgICAgICAgIHN1cGVyKCk7XG4gICAgICAgICAgICB0aGlzLmNvbG9yID0gX2NvbG9yO1xuICAgICAgICB9XG4gICAgICAgIHByb3RlY3RlZCByZWR1Y2VNdXRhdG9yKCk6IHZvaWQgey8qKi8gfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFtYmllbnQgbGlnaHQsIGNvbWluZyBmcm9tIGFsbCBkaXJlY3Rpb25zLCBpbGx1bWluYXRpbmcgZXZlcnl0aGluZyB3aXRoIGl0cyBjb2xvciBpbmRlcGVuZGVudCBvZiBwb3NpdGlvbiBhbmQgb3JpZW50YXRpb24gKGxpa2UgYSBmb2dneSBkYXkgb3IgaW4gdGhlIHNoYWRlcykgIFxuICAgICAqIGBgYHBsYWludGV4dFxuICAgICAqIH4gfiB+ICBcbiAgICAgKiAgfiB+IH4gIFxuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGV4cG9ydCBjbGFzcyBMaWdodEFtYmllbnQgZXh0ZW5kcyBMaWdodCB7XG4gICAgICAgIGNvbnN0cnVjdG9yKF9jb2xvcjogQ29sb3IgPSBuZXcgQ29sb3IoMSwgMSwgMSwgMSkpIHtcbiAgICAgICAgICAgIHN1cGVyKF9jb2xvcik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogRGlyZWN0aW9uYWwgbGlnaHQsIGlsbHVtaW5hdGluZyBldmVyeXRoaW5nIGZyb20gYSBzcGVjaWZpZWQgZGlyZWN0aW9uIHdpdGggaXRzIGNvbG9yIChsaWtlIHN0YW5kaW5nIGluIGJyaWdodCBzdW5saWdodCkgIFxuICAgICAqIGBgYHBsYWludGV4dFxuICAgICAqIC0tLT4gIFxuICAgICAqIC0tLT4gIFxuICAgICAqIC0tLT4gIFxuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGV4cG9ydCBjbGFzcyBMaWdodERpcmVjdGlvbmFsIGV4dGVuZHMgTGlnaHQge1xuICAgICAgICBjb25zdHJ1Y3RvcihfY29sb3I6IENvbG9yID0gbmV3IENvbG9yKDEsIDEsIDEsIDEpKSB7XG4gICAgICAgICAgICBzdXBlcihfY29sb3IpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIE9tbmlkaXJlY3Rpb25hbCBsaWdodCBlbWl0dGluZyBmcm9tIGl0cyBwb3NpdGlvbiwgaWxsdW1pbmF0aW5nIG9iamVjdHMgZGVwZW5kaW5nIG9uIHRoZWlyIHBvc2l0aW9uIGFuZCBkaXN0YW5jZSB3aXRoIGl0cyBjb2xvciAobGlrZSBhIGNvbG9yZWQgbGlnaHQgYnVsYikgIFxuICAgICAqIGBgYHBsYWludGV4dFxuICAgICAqICAgICAgICAgLlxcfC8uXG4gICAgICogICAgICAgIC0tIG8gLS1cbiAgICAgKiAgICAgICAgIMK0L3xcXGBcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBleHBvcnQgY2xhc3MgTGlnaHRQb2ludCBleHRlbmRzIExpZ2h0IHtcbiAgICAgICAgcHVibGljIHJhbmdlOiBudW1iZXIgPSAxMDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogU3BvdCBsaWdodCBlbWl0dGluZyB3aXRoaW4gYSBzcGVjaWZpZWQgYW5nbGUgZnJvbSBpdHMgcG9zaXRpb24sIGlsbHVtaW5hdGluZyBvYmplY3RzIGRlcGVuZGluZyBvbiB0aGVpciBwb3NpdGlvbiBhbmQgZGlzdGFuY2Ugd2l0aCBpdHMgY29sb3IgIFxuICAgICAqIGBgYHBsYWludGV4dFxuICAgICAqICAgICAgICAgIG8gIFxuICAgICAqICAgICAgICAgL3xcXCAgXG4gICAgICogICAgICAgIC8gfCBcXCBcbiAgICAgKiBgYGAgICBcbiAgICAgKi9cbiAgICBleHBvcnQgY2xhc3MgTGlnaHRTcG90IGV4dGVuZHMgTGlnaHQge1xuICAgIH1cbn0iLCIvLy88cmVmZXJlbmNlIHBhdGg9XCIuLi9MaWdodC9MaWdodC50c1wiLz5cbm5hbWVzcGFjZSBGdWRnZUNvcmUge1xuICAgIC8qKlxuICAgICAqIEF0dGFjaGVzIGEgW1tMaWdodF1dIHRvIHRoZSBub2RlXG4gICAgICogQGF1dGhvcnMgSmlya2EgRGVsbCdPcm8tRnJpZWRsLCBIRlUsIDIwMTlcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIERlZmluZXMgaWRlbnRpZmllcnMgZm9yIHRoZSB2YXJpb3VzIHR5cGVzIG9mIGxpZ2h0IHRoaXMgY29tcG9uZW50IGNhbiBwcm92aWRlLiAgXG4gICAgICovXG4gICAgLy8gZXhwb3J0IGVudW0gTElHSFRfVFlQRSB7XG4gICAgLy8gICAgIEFNQklFTlQgPSBcImFtYmllbnRcIixcbiAgICAvLyAgICAgRElSRUNUSU9OQUwgPSBcImRpcmVjdGlvbmFsXCIsXG4gICAgLy8gICAgIFBPSU5UID0gXCJwb2ludFwiLFxuICAgIC8vICAgICBTUE9UID0gXCJzcG90XCJcbiAgICAvLyB9XG5cbiAgICBleHBvcnQgY2xhc3MgQ29tcG9uZW50TGlnaHQgZXh0ZW5kcyBDb21wb25lbnQge1xuICAgICAgICAvLyBwcml2YXRlIHN0YXRpYyBjb25zdHJ1Y3RvcnM6IHsgW3R5cGU6IHN0cmluZ106IEdlbmVyYWwgfSA9IHsgW0xJR0hUX1RZUEUuQU1CSUVOVF06IExpZ2h0QW1iaWVudCwgW0xJR0hUX1RZUEUuRElSRUNUSU9OQUxdOiBMaWdodERpcmVjdGlvbmFsLCBbTElHSFRfVFlQRS5QT0lOVF06IExpZ2h0UG9pbnQsIFtMSUdIVF9UWVBFLlNQT1RdOiBMaWdodFNwb3QgfTtcbiAgICAgICAgcHVibGljIHBpdm90OiBNYXRyaXg0eDQgPSBNYXRyaXg0eDQuSURFTlRJVFk7XG4gICAgICAgIHB1YmxpYyBsaWdodDogTGlnaHQgPSBudWxsO1xuXG4gICAgICAgIGNvbnN0cnVjdG9yKF9saWdodDogTGlnaHQgPSBuZXcgTGlnaHRBbWJpZW50KCkpIHtcbiAgICAgICAgICAgIHN1cGVyKCk7XG4gICAgICAgICAgICB0aGlzLnNpbmdsZXRvbiA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5saWdodCA9IF9saWdodDtcbiAgICAgICAgfVxuXG4gICAgICAgIHB1YmxpYyBzZXRUeXBlPFQgZXh0ZW5kcyBMaWdodD4oX2NsYXNzOiBuZXcgKCkgPT4gVCk6IHZvaWQge1xuICAgICAgICAgICAgbGV0IG10ck9sZDogTXV0YXRvciA9IHt9O1xuICAgICAgICAgICAgaWYgKHRoaXMubGlnaHQpXG4gICAgICAgICAgICAgICAgbXRyT2xkID0gdGhpcy5saWdodC5nZXRNdXRhdG9yKCk7XG5cbiAgICAgICAgICAgIHRoaXMubGlnaHQgPSBuZXcgX2NsYXNzKCk7XG4gICAgICAgICAgICB0aGlzLmxpZ2h0Lm11dGF0ZShtdHJPbGQpO1xuICAgICAgICB9XG4gICAgfVxufVxuIiwibmFtZXNwYWNlIEZ1ZGdlQ29yZSB7XG4gICAgLyoqXG4gICAgICogQXR0YWNoZXMgYSBbW01hdGVyaWFsXV0gdG8gdGhlIG5vZGVcbiAgICAgKiBAYXV0aG9ycyBKaXJrYSBEZWxsJ09yby1GcmllZGwsIEhGVSwgMjAxOVxuICAgICAqL1xuICAgIGV4cG9ydCBjbGFzcyBDb21wb25lbnRNYXRlcmlhbCBleHRlbmRzIENvbXBvbmVudCB7XG4gICAgICAgIHB1YmxpYyBtYXRlcmlhbDogTWF0ZXJpYWw7XG5cbiAgICAgICAgcHVibGljIGNvbnN0cnVjdG9yKF9tYXRlcmlhbDogTWF0ZXJpYWwgPSBudWxsKSB7XG4gICAgICAgICAgICBzdXBlcigpO1xuICAgICAgICAgICAgdGhpcy5tYXRlcmlhbCA9IF9tYXRlcmlhbDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vI3JlZ2lvbiBUcmFuc2ZlclxuICAgICAgICBwdWJsaWMgc2VyaWFsaXplKCk6IFNlcmlhbGl6YXRpb24ge1xuICAgICAgICAgICAgbGV0IHNlcmlhbGl6YXRpb246IFNlcmlhbGl6YXRpb247XG4gICAgICAgICAgICAvKiBhdCB0aGlzIHBvaW50IG9mIHRpbWUsIHNlcmlhbGl6YXRpb24gYXMgcmVzb3VyY2UgYW5kIGFzIGlubGluZSBvYmplY3QgaXMgcG9zc2libGUuIFRPRE86IGNoZWNrIGlmIGlubGluZSBiZWNvbWVzIG9ic29sZXRlICovXG4gICAgICAgICAgICBsZXQgaWRNYXRlcmlhbDogc3RyaW5nID0gdGhpcy5tYXRlcmlhbC5pZFJlc291cmNlO1xuICAgICAgICAgICAgaWYgKGlkTWF0ZXJpYWwpXG4gICAgICAgICAgICAgICAgc2VyaWFsaXphdGlvbiA9IHsgaWRNYXRlcmlhbDogaWRNYXRlcmlhbCB9O1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIHNlcmlhbGl6YXRpb24gPSB7IG1hdGVyaWFsOiBTZXJpYWxpemVyLnNlcmlhbGl6ZSh0aGlzLm1hdGVyaWFsKSB9O1xuXG4gICAgICAgICAgICBzZXJpYWxpemF0aW9uW3N1cGVyLmNvbnN0cnVjdG9yLm5hbWVdID0gc3VwZXIuc2VyaWFsaXplKCk7XG4gICAgICAgICAgICByZXR1cm4gc2VyaWFsaXphdGlvbjtcbiAgICAgICAgfVxuICAgICAgICBwdWJsaWMgZGVzZXJpYWxpemUoX3NlcmlhbGl6YXRpb246IFNlcmlhbGl6YXRpb24pOiBTZXJpYWxpemFibGUge1xuICAgICAgICAgICAgbGV0IG1hdGVyaWFsOiBNYXRlcmlhbDtcbiAgICAgICAgICAgIGlmIChfc2VyaWFsaXphdGlvbi5pZE1hdGVyaWFsKVxuICAgICAgICAgICAgICAgIG1hdGVyaWFsID0gPE1hdGVyaWFsPlJlc291cmNlTWFuYWdlci5nZXQoX3NlcmlhbGl6YXRpb24uaWRNYXRlcmlhbCk7XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgbWF0ZXJpYWwgPSA8TWF0ZXJpYWw+U2VyaWFsaXplci5kZXNlcmlhbGl6ZShfc2VyaWFsaXphdGlvbi5tYXRlcmlhbCk7XG4gICAgICAgICAgICB0aGlzLm1hdGVyaWFsID0gbWF0ZXJpYWw7XG4gICAgICAgICAgICBzdXBlci5kZXNlcmlhbGl6ZShfc2VyaWFsaXphdGlvbltzdXBlci5jb25zdHJ1Y3Rvci5uYW1lXSk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICAvLyNlbmRyZWdpb25cbiAgICB9XG59IiwibmFtZXNwYWNlIEZ1ZGdlQ29yZSB7XG4gICAgLyoqXG4gICAgICogQXR0YWNoZXMgYSBbW01lc2hdXSB0byB0aGUgbm9kZVxuICAgICAqIEBhdXRob3JzIEppcmthIERlbGwnT3JvLUZyaWVkbCwgSEZVLCAyMDE5XG4gICAgICovXG4gICAgZXhwb3J0IGNsYXNzIENvbXBvbmVudE1lc2ggZXh0ZW5kcyBDb21wb25lbnQge1xuICAgICAgICBwdWJsaWMgcGl2b3Q6IE1hdHJpeDR4NCA9IE1hdHJpeDR4NC5JREVOVElUWTtcbiAgICAgICAgcHVibGljIG1lc2g6IE1lc2ggPSBudWxsO1xuXG4gICAgICAgIHB1YmxpYyBjb25zdHJ1Y3RvcihfbWVzaDogTWVzaCA9IG51bGwpIHtcbiAgICAgICAgICAgIHN1cGVyKCk7XG4gICAgICAgICAgICB0aGlzLm1lc2ggPSBfbWVzaDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vI3JlZ2lvbiBUcmFuc2ZlclxuICAgICAgICBwdWJsaWMgc2VyaWFsaXplKCk6IFNlcmlhbGl6YXRpb24ge1xuICAgICAgICAgICAgbGV0IHNlcmlhbGl6YXRpb246IFNlcmlhbGl6YXRpb247XG4gICAgICAgICAgICAvKiBhdCB0aGlzIHBvaW50IG9mIHRpbWUsIHNlcmlhbGl6YXRpb24gYXMgcmVzb3VyY2UgYW5kIGFzIGlubGluZSBvYmplY3QgaXMgcG9zc2libGUuIFRPRE86IGNoZWNrIGlmIGlubGluZSBiZWNvbWVzIG9ic29sZXRlICovXG4gICAgICAgICAgICBsZXQgaWRNZXNoOiBzdHJpbmcgPSB0aGlzLm1lc2guaWRSZXNvdXJjZTtcbiAgICAgICAgICAgIGlmIChpZE1lc2gpXG4gICAgICAgICAgICAgICAgc2VyaWFsaXphdGlvbiA9IHsgaWRNZXNoOiBpZE1lc2ggfTtcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBzZXJpYWxpemF0aW9uID0geyBtZXNoOiBTZXJpYWxpemVyLnNlcmlhbGl6ZSh0aGlzLm1lc2gpIH07XG5cbiAgICAgICAgICAgIHNlcmlhbGl6YXRpb24ucGl2b3QgPSB0aGlzLnBpdm90LnNlcmlhbGl6ZSgpO1xuICAgICAgICAgICAgc2VyaWFsaXphdGlvbltzdXBlci5jb25zdHJ1Y3Rvci5uYW1lXSA9IHN1cGVyLnNlcmlhbGl6ZSgpO1xuICAgICAgICAgICAgcmV0dXJuIHNlcmlhbGl6YXRpb247XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgZGVzZXJpYWxpemUoX3NlcmlhbGl6YXRpb246IFNlcmlhbGl6YXRpb24pOiBTZXJpYWxpemFibGUge1xuICAgICAgICAgICAgbGV0IG1lc2g6IE1lc2g7XG4gICAgICAgICAgICBpZiAoX3NlcmlhbGl6YXRpb24uaWRNZXNoKVxuICAgICAgICAgICAgICAgIG1lc2ggPSA8TWVzaD5SZXNvdXJjZU1hbmFnZXIuZ2V0KF9zZXJpYWxpemF0aW9uLmlkTWVzaCk7XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgbWVzaCA9IDxNZXNoPlNlcmlhbGl6ZXIuZGVzZXJpYWxpemUoX3NlcmlhbGl6YXRpb24ubWVzaCk7XG4gICAgICAgICAgICB0aGlzLm1lc2ggPSBtZXNoO1xuXG4gICAgICAgICAgICB0aGlzLnBpdm90LmRlc2VyaWFsaXplKF9zZXJpYWxpemF0aW9uLnBpdm90KTtcbiAgICAgICAgICAgIHN1cGVyLmRlc2VyaWFsaXplKF9zZXJpYWxpemF0aW9uW3N1cGVyLmNvbnN0cnVjdG9yLm5hbWVdKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIC8vI2VuZHJlZ2lvblxuICAgIH1cbn1cbiIsIm5hbWVzcGFjZSBGdWRnZUNvcmUge1xuICAgIC8qKlxuICAgICAqIEJhc2UgY2xhc3MgZm9yIHNjcmlwdHMgdGhlIHVzZXIgd3JpdGVzXG4gICAgICogQGF1dGhvcnMgSmlya2EgRGVsbCdPcm8tRnJpZWRsLCBIRlUsIDIwMTlcbiAgICAgKi9cbiAgICBleHBvcnQgY2xhc3MgQ29tcG9uZW50U2NyaXB0IGV4dGVuZHMgQ29tcG9uZW50IHtcbiAgICAgICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgICAgICBzdXBlcigpO1xuICAgICAgICAgICAgdGhpcy5zaW5nbGV0b24gPSBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHB1YmxpYyBzZXJpYWxpemUoKTogU2VyaWFsaXphdGlvbiB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRNdXRhdG9yKCk7XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgZGVzZXJpYWxpemUoX3NlcmlhbGl6YXRpb246IFNlcmlhbGl6YXRpb24pOiBTZXJpYWxpemFibGUge1xuICAgICAgICAgICAgdGhpcy5tdXRhdGUoX3NlcmlhbGl6YXRpb24pO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG59IiwibmFtZXNwYWNlIEZ1ZGdlQ29yZSB7XG4gICAgLyoqXG4gICAgICogQXR0YWNoZXMgYSB0cmFuc2Zvcm0tW1tNYXRyaXg0eDRdXSB0byB0aGUgbm9kZSwgbW92aW5nLCBzY2FsaW5nIGFuZCByb3RhdGluZyBpdCBpbiBzcGFjZSByZWxhdGl2ZSB0byBpdHMgcGFyZW50LlxuICAgICAqIEBhdXRob3JzIEppcmthIERlbGwnT3JvLUZyaWVkbCwgSEZVLCAyMDE5XG4gICAgICovXG4gICAgZXhwb3J0IGNsYXNzIENvbXBvbmVudFRyYW5zZm9ybSBleHRlbmRzIENvbXBvbmVudCB7XG4gICAgICAgIHB1YmxpYyBsb2NhbDogTWF0cml4NHg0O1xuXG4gICAgICAgIHB1YmxpYyBjb25zdHJ1Y3RvcihfbWF0cml4OiBNYXRyaXg0eDQgPSBNYXRyaXg0eDQuSURFTlRJVFkpIHtcbiAgICAgICAgICAgIHN1cGVyKCk7XG4gICAgICAgICAgICB0aGlzLmxvY2FsID0gX21hdHJpeDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vI3JlZ2lvbiBUcmFuc2ZlclxuICAgICAgICBwdWJsaWMgc2VyaWFsaXplKCk6IFNlcmlhbGl6YXRpb24ge1xuICAgICAgICAgICAgbGV0IHNlcmlhbGl6YXRpb246IFNlcmlhbGl6YXRpb24gPSB7XG4gICAgICAgICAgICAgICAgbG9jYWw6IHRoaXMubG9jYWwuc2VyaWFsaXplKCksXG4gICAgICAgICAgICAgICAgW3N1cGVyLmNvbnN0cnVjdG9yLm5hbWVdOiBzdXBlci5zZXJpYWxpemUoKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiBzZXJpYWxpemF0aW9uO1xuICAgICAgICB9XG4gICAgICAgIHB1YmxpYyBkZXNlcmlhbGl6ZShfc2VyaWFsaXphdGlvbjogU2VyaWFsaXphdGlvbik6IFNlcmlhbGl6YWJsZSB7XG4gICAgICAgICAgICBzdXBlci5kZXNlcmlhbGl6ZShfc2VyaWFsaXphdGlvbltzdXBlci5jb25zdHJ1Y3Rvci5uYW1lXSk7XG4gICAgICAgICAgICB0aGlzLmxvY2FsLmRlc2VyaWFsaXplKF9zZXJpYWxpemF0aW9uLmxvY2FsKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gcHVibGljIG11dGF0ZShfbXV0YXRvcjogTXV0YXRvcik6IHZvaWQge1xuICAgICAgICAvLyAgICAgdGhpcy5sb2NhbC5tdXRhdGUoX211dGF0b3IpO1xuICAgICAgICAvLyB9XG4gICAgICAgIC8vIHB1YmxpYyBnZXRNdXRhdG9yKCk6IE11dGF0b3IgeyBcbiAgICAgICAgLy8gICAgIHJldHVybiB0aGlzLmxvY2FsLmdldE11dGF0b3IoKTtcbiAgICAgICAgLy8gfVxuXG4gICAgICAgIC8vIHB1YmxpYyBnZXRNdXRhdG9yQXR0cmlidXRlVHlwZXMoX211dGF0b3I6IE11dGF0b3IpOiBNdXRhdG9yQXR0cmlidXRlVHlwZXMge1xuICAgICAgICAvLyAgICAgbGV0IHR5cGVzOiBNdXRhdG9yQXR0cmlidXRlVHlwZXMgPSB0aGlzLmxvY2FsLmdldE11dGF0b3JBdHRyaWJ1dGVUeXBlcyhfbXV0YXRvcik7XG4gICAgICAgIC8vICAgICByZXR1cm4gdHlwZXM7XG4gICAgICAgIC8vIH1cblxuICAgICAgICBwcm90ZWN0ZWQgcmVkdWNlTXV0YXRvcihfbXV0YXRvcjogTXV0YXRvcik6IHZvaWQge1xuICAgICAgICAgICAgZGVsZXRlIF9tdXRhdG9yLndvcmxkO1xuICAgICAgICAgICAgc3VwZXIucmVkdWNlTXV0YXRvcihfbXV0YXRvcik7XG4gICAgICAgIH1cbiAgICAgICAgLy8jZW5kcmVnaW9uXG4gICAgfVxufVxuIiwiLy8gPHJlZmVyZW5jZSBwYXRoPVwiRGVidWdBbGVydC50c1wiLz5cbm5hbWVzcGFjZSBGdWRnZUNvcmUge1xuICAgIC8qKlxuICAgICAqIFRoZSBmaWx0ZXJzIGNvcnJlc3BvbmRpbmcgdG8gZGVidWcgYWN0aXZpdGllcywgbW9yZSB0byBjb21lXG4gICAgICovXG4gICAgZXhwb3J0IGVudW0gREVCVUdfRklMVEVSIHtcbiAgICAgICAgTk9ORSA9IDB4MDAsXG4gICAgICAgIElORk8gPSAweDAxLFxuICAgICAgICBMT0cgPSAweDAyLFxuICAgICAgICBXQVJOID0gMHgwNCxcbiAgICAgICAgRVJST1IgPSAweDA4LFxuICAgICAgICBBTEwgPSBJTkZPIHwgTE9HIHwgV0FSTiB8IEVSUk9SXG4gICAgfVxuICAgIC8vIHJlbWluZXNjZW50IG9mIGFuIGVhcmx5IGF0dGVtcHQgb2YgRGVidWdcbiAgICAvLyBleHBvcnQgZW51bSBERUJVR19UQVJHRVQge1xuICAgIC8vICAgICBDT05TT0xFID0gXCJjb25zb2xlXCIsXG4gICAgLy8gICAgIEFMRVJUID0gXCJhbGVydFwiLFxuICAgIC8vICAgICBURVhUQVJFQSA9IFwidGV4dGFyZWFcIixcbiAgICAvLyAgICAgRElBTE9HID0gXCJkaWFsb2dcIixcbiAgICAvLyAgICAgRklMRSA9IFwiZmlsZVwiLFxuICAgIC8vICAgICBTRVJWRVIgPSBcInNlcnZlclwiXG4gICAgLy8gfVxuXG4gICAgLy8gZXhwb3J0IGludGVyZmFjZSBNYXBEZWJ1Z1RhcmdldFRvRnVuY3Rpb24geyBbdGFyZ2V0OiBzdHJpbmddOiBGdW5jdGlvbjsgfVxuICAgIGV4cG9ydCB0eXBlIE1hcERlYnVnVGFyZ2V0VG9EZWxlZ2F0ZSA9IE1hcDxEZWJ1Z1RhcmdldCwgRnVuY3Rpb24+O1xuICAgIGV4cG9ydCBpbnRlcmZhY2UgTWFwRGVidWdGaWx0ZXJUb0RlbGVnYXRlIHsgW2ZpbHRlcjogbnVtYmVyXTogRnVuY3Rpb247IH1cbn0iLCJuYW1lc3BhY2UgRnVkZ2VDb3JlIHtcbiAgICAvKipcbiAgICAgKiBCYXNlIGNsYXNzIGZvciB0aGUgZGlmZmVyZW50IERlYnVnVGFyZ2V0cywgbWFpbmx5IGZvciB0ZWNobmljYWwgcHVycG9zZSBvZiBpbmhlcml0YW5jZVxuICAgICAqL1xuICAgIGV4cG9ydCBhYnN0cmFjdCBjbGFzcyBEZWJ1Z1RhcmdldCB7XG4gICAgICAgIHB1YmxpYyBkZWxlZ2F0ZXM6IE1hcERlYnVnRmlsdGVyVG9EZWxlZ2F0ZTtcbiAgICAgICAgcHVibGljIHN0YXRpYyBtZXJnZUFyZ3VtZW50cyhfbWVzc2FnZTogT2JqZWN0LCAuLi5fYXJnczogT2JqZWN0W10pOiBzdHJpbmcge1xuICAgICAgICAgICAgbGV0IG91dDogc3RyaW5nID0gSlNPTi5zdHJpbmdpZnkoX21lc3NhZ2UpO1xuICAgICAgICAgICAgZm9yIChsZXQgYXJnIG9mIF9hcmdzKVxuICAgICAgICAgICAgICAgIG91dCArPSBcIlxcblwiICsgSlNPTi5zdHJpbmdpZnkoYXJnLCBudWxsLCAyKTtcbiAgICAgICAgICAgIHJldHVybiBvdXQ7XG4gICAgICAgIH1cbiAgICB9XG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIkRlYnVnVGFyZ2V0LnRzXCIvPlxubmFtZXNwYWNlIEZ1ZGdlQ29yZSB7XG4gICAgLyoqXG4gICAgICogUm91dGluZyB0byB0aGUgYWxlcnQgYm94XG4gICAgICovXG4gICAgZXhwb3J0IGNsYXNzIERlYnVnQWxlcnQgZXh0ZW5kcyBEZWJ1Z1RhcmdldCB7XG4gICAgICAgIHB1YmxpYyBzdGF0aWMgZGVsZWdhdGVzOiBNYXBEZWJ1Z0ZpbHRlclRvRGVsZWdhdGUgPSB7XG4gICAgICAgICAgICBbREVCVUdfRklMVEVSLklORk9dOiBEZWJ1Z0FsZXJ0LmNyZWF0ZURlbGVnYXRlKFwiSW5mb1wiKSxcbiAgICAgICAgICAgIFtERUJVR19GSUxURVIuTE9HXTogRGVidWdBbGVydC5jcmVhdGVEZWxlZ2F0ZShcIkxvZ1wiKSxcbiAgICAgICAgICAgIFtERUJVR19GSUxURVIuV0FSTl06IERlYnVnQWxlcnQuY3JlYXRlRGVsZWdhdGUoXCJXYXJuXCIpLFxuICAgICAgICAgICAgW0RFQlVHX0ZJTFRFUi5FUlJPUl06IERlYnVnQWxlcnQuY3JlYXRlRGVsZWdhdGUoXCJFcnJvclwiKVxuICAgICAgICB9O1xuICAgICAgICBwdWJsaWMgc3RhdGljIGNyZWF0ZURlbGVnYXRlKF9oZWFkbGluZTogc3RyaW5nKTogRnVuY3Rpb24ge1xuICAgICAgICAgICAgbGV0IGRlbGVnYXRlOiBGdW5jdGlvbiA9IGZ1bmN0aW9uIChfbWVzc2FnZTogT2JqZWN0LCAuLi5fYXJnczogT2JqZWN0W10pOiB2b2lkIHtcbiAgICAgICAgICAgICAgICBsZXQgb3V0OiBzdHJpbmcgPSBfaGVhZGxpbmUgKyBcIlxcblxcblwiICsgRGVidWdUYXJnZXQubWVyZ2VBcmd1bWVudHMoX21lc3NhZ2UsIC4uLl9hcmdzKTtcbiAgICAgICAgICAgICAgICBhbGVydChvdXQpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiBkZWxlZ2F0ZTtcbiAgICAgICAgfVxuICAgIH1cbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiRGVidWdUYXJnZXQudHNcIi8+XG5uYW1lc3BhY2UgRnVkZ2VDb3JlIHtcbiAgICAvKipcbiAgICAgKiBSb3V0aW5nIHRvIHRoZSBzdGFuZGFyZC1jb25zb2xlXG4gICAgICovXG4gICAgZXhwb3J0IGNsYXNzIERlYnVnQ29uc29sZSBleHRlbmRzIERlYnVnVGFyZ2V0IHtcbiAgICAgICAgcHVibGljIHN0YXRpYyBkZWxlZ2F0ZXM6IE1hcERlYnVnRmlsdGVyVG9EZWxlZ2F0ZSA9IHtcbiAgICAgICAgICAgIFtERUJVR19GSUxURVIuSU5GT106IGNvbnNvbGUuaW5mbyxcbiAgICAgICAgICAgIFtERUJVR19GSUxURVIuTE9HXTogY29uc29sZS5sb2csXG4gICAgICAgICAgICBbREVCVUdfRklMVEVSLldBUk5dOiBjb25zb2xlLndhcm4sXG4gICAgICAgICAgICBbREVCVUdfRklMVEVSLkVSUk9SXTogY29uc29sZS5lcnJvclxuICAgICAgICB9O1xuICAgIH1cbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiRGVidWdJbnRlcmZhY2VzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIkRlYnVnQWxlcnQudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiRGVidWdDb25zb2xlLnRzXCIvPlxubmFtZXNwYWNlIEZ1ZGdlQ29yZSB7XG4gICAgLyoqXG4gICAgICogVGhlIERlYnVnLUNsYXNzIG9mZmVycyBmdW5jdGlvbnMga25vd24gZnJvbSB0aGUgY29uc29sZS1vYmplY3QgYW5kIGFkZGl0aW9ucywgXG4gICAgICogcm91dGluZyB0aGUgaW5mb3JtYXRpb24gdG8gdmFyaW91cyBbW0RlYnVnVGFyZ2V0c11dIHRoYXQgY2FuIGJlIGVhc2lseSBkZWZpbmVkIGJ5IHRoZSBkZXZlbG9wZXJzIGFuZCByZWdpc3RlcmQgYnkgdXNlcnNcbiAgICAgKi9cbiAgICBleHBvcnQgY2xhc3MgRGVidWcge1xuICAgICAgICAvKipcbiAgICAgICAgICogRm9yIGVhY2ggc2V0IGZpbHRlciwgdGhpcyBhc3NvY2lhdGl2ZSBhcnJheSBrZWVwcyByZWZlcmVuY2VzIHRvIHRoZSByZWdpc3RlcmVkIGRlbGVnYXRlIGZ1bmN0aW9ucyBvZiB0aGUgY2hvc2VuIFtbRGVidWdUYXJnZXRzXV1cbiAgICAgICAgICovXG4gICAgICAgIC8vIFRPRE86IGltcGxlbWVudCBhbm9ueW1vdXMgZnVuY3Rpb24gc2V0dGluZyB1cCBhbGwgZmlsdGVyc1xuICAgICAgICBwcml2YXRlIHN0YXRpYyBkZWxlZ2F0ZXM6IHsgW2ZpbHRlcjogbnVtYmVyXTogTWFwRGVidWdUYXJnZXRUb0RlbGVnYXRlIH0gPSB7XG4gICAgICAgICAgICBbREVCVUdfRklMVEVSLklORk9dOiBuZXcgTWFwKFtbRGVidWdDb25zb2xlLCBEZWJ1Z0NvbnNvbGUuZGVsZWdhdGVzW0RFQlVHX0ZJTFRFUi5JTkZPXV1dKSxcbiAgICAgICAgICAgIFtERUJVR19GSUxURVIuTE9HXTogbmV3IE1hcChbW0RlYnVnQ29uc29sZSwgRGVidWdDb25zb2xlLmRlbGVnYXRlc1tERUJVR19GSUxURVIuTE9HXV1dKSxcbiAgICAgICAgICAgIFtERUJVR19GSUxURVIuV0FSTl06IG5ldyBNYXAoW1tEZWJ1Z0NvbnNvbGUsIERlYnVnQ29uc29sZS5kZWxlZ2F0ZXNbREVCVUdfRklMVEVSLldBUk5dXV0pLFxuICAgICAgICAgICAgW0RFQlVHX0ZJTFRFUi5FUlJPUl06IG5ldyBNYXAoW1tEZWJ1Z0NvbnNvbGUsIERlYnVnQ29uc29sZS5kZWxlZ2F0ZXNbREVCVUdfRklMVEVSLkVSUk9SXV1dKVxuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZS0gLyBBY3RpdmF0ZSBhIGZpbHRlciBmb3IgdGhlIGdpdmVuIERlYnVnVGFyZ2V0LiBcbiAgICAgICAgICogQHBhcmFtIF90YXJnZXRcbiAgICAgICAgICogQHBhcmFtIF9maWx0ZXIgXG4gICAgICAgICAqL1xuICAgICAgICBwdWJsaWMgc3RhdGljIHNldEZpbHRlcihfdGFyZ2V0OiBEZWJ1Z1RhcmdldCwgX2ZpbHRlcjogREVCVUdfRklMVEVSKTogdm9pZCB7XG4gICAgICAgICAgICBmb3IgKGxldCBmaWx0ZXIgaW4gRGVidWcuZGVsZWdhdGVzKVxuICAgICAgICAgICAgICAgIERlYnVnLmRlbGVnYXRlc1tmaWx0ZXJdLmRlbGV0ZShfdGFyZ2V0KTtcblxuICAgICAgICAgICAgZm9yIChsZXQgZmlsdGVyIGluIERFQlVHX0ZJTFRFUikge1xuICAgICAgICAgICAgICAgIGxldCBwYXJzZWQ6IG51bWJlciA9IHBhcnNlSW50KGZpbHRlcik7XG4gICAgICAgICAgICAgICAgaWYgKHBhcnNlZCA9PSBERUJVR19GSUxURVIuQUxMKVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBpZiAoX2ZpbHRlciAmIHBhcnNlZClcbiAgICAgICAgICAgICAgICAgICAgRGVidWcuZGVsZWdhdGVzW3BhcnNlZF0uc2V0KF90YXJnZXQsIF90YXJnZXQuZGVsZWdhdGVzW3BhcnNlZF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIERlYnVnIGZ1bmN0aW9uIHRvIGJlIGltcGxlbWVudGVkIGJ5IHRoZSBEZWJ1Z1RhcmdldC4gXG4gICAgICAgICAqIGluZm8oLi4uKSBkaXNwbGF5cyBhZGRpdGlvbmFsIGluZm9ybWF0aW9uIHdpdGggbG93IHByaW9yaXR5XG4gICAgICAgICAqIEBwYXJhbSBfbWVzc2FnZVxuICAgICAgICAgKiBAcGFyYW0gX2FyZ3MgXG4gICAgICAgICAqL1xuICAgICAgICBwdWJsaWMgc3RhdGljIGluZm8oX21lc3NhZ2U6IE9iamVjdCwgLi4uX2FyZ3M6IE9iamVjdFtdKTogdm9pZCB7XG4gICAgICAgICAgICBEZWJ1Zy5kZWxlZ2F0ZShERUJVR19GSUxURVIuSU5GTywgX21lc3NhZ2UsIF9hcmdzKTtcbiAgICAgICAgfVxuICAgICAgICAvKipcbiAgICAgICAgICogRGVidWcgZnVuY3Rpb24gdG8gYmUgaW1wbGVtZW50ZWQgYnkgdGhlIERlYnVnVGFyZ2V0LiBcbiAgICAgICAgICogbG9nKC4uLikgZGlzcGxheXMgaW5mb3JtYXRpb24gd2l0aCBtZWRpdW0gcHJpb3JpdHlcbiAgICAgICAgICogQHBhcmFtIF9tZXNzYWdlXG4gICAgICAgICAqIEBwYXJhbSBfYXJncyBcbiAgICAgICAgICovXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgbG9nKF9tZXNzYWdlOiBPYmplY3QsIC4uLl9hcmdzOiBPYmplY3RbXSk6IHZvaWQge1xuICAgICAgICAgICAgRGVidWcuZGVsZWdhdGUoREVCVUdfRklMVEVSLkxPRywgX21lc3NhZ2UsIF9hcmdzKTtcbiAgICAgICAgfVxuICAgICAgICAvKipcbiAgICAgICAgICogRGVidWcgZnVuY3Rpb24gdG8gYmUgaW1wbGVtZW50ZWQgYnkgdGhlIERlYnVnVGFyZ2V0LiBcbiAgICAgICAgICogd2FybiguLi4pIGRpc3BsYXlzIGluZm9ybWF0aW9uIGFib3V0IG5vbi1jb25mb3JtaXRpZXMgaW4gdXNhZ2UsIHdoaWNoIGlzIGVtcGhhc2l6ZWQgZS5nLiBieSBjb2xvclxuICAgICAgICAgKiBAcGFyYW0gX21lc3NhZ2VcbiAgICAgICAgICogQHBhcmFtIF9hcmdzIFxuICAgICAgICAgKi9cbiAgICAgICAgcHVibGljIHN0YXRpYyB3YXJuKF9tZXNzYWdlOiBPYmplY3QsIC4uLl9hcmdzOiBPYmplY3RbXSk6IHZvaWQge1xuICAgICAgICAgICAgRGVidWcuZGVsZWdhdGUoREVCVUdfRklMVEVSLldBUk4sIF9tZXNzYWdlLCBfYXJncyk7XG4gICAgICAgIH1cbiAgICAgICAgLyoqXG4gICAgICAgICAqIERlYnVnIGZ1bmN0aW9uIHRvIGJlIGltcGxlbWVudGVkIGJ5IHRoZSBEZWJ1Z1RhcmdldC4gXG4gICAgICAgICAqIGVycm9yKC4uLikgZGlzcGxheXMgY3JpdGljYWwgaW5mb3JtYXRpb24gYWJvdXQgZmFpbHVyZXMsIHdoaWNoIGlzIGVtcGhhc2l6ZWQgZS5nLiBieSBjb2xvclxuICAgICAgICAgKiBAcGFyYW0gX21lc3NhZ2VcbiAgICAgICAgICogQHBhcmFtIF9hcmdzIFxuICAgICAgICAgKi9cbiAgICAgICAgcHVibGljIHN0YXRpYyBlcnJvcihfbWVzc2FnZTogT2JqZWN0LCAuLi5fYXJnczogT2JqZWN0W10pOiB2b2lkIHtcbiAgICAgICAgICAgIERlYnVnLmRlbGVnYXRlKERFQlVHX0ZJTFRFUi5FUlJPUiwgX21lc3NhZ2UsIF9hcmdzKTtcbiAgICAgICAgfVxuICAgICAgICAvKipcbiAgICAgICAgICogTG9va3VwIGFsbCBkZWxlZ2F0ZXMgcmVnaXN0ZXJlZCB0byB0aGUgZmlsdGVyIGFuZCBjYWxsIHRoZW0gdXNpbmcgdGhlIGdpdmVuIGFyZ3VtZW50c1xuICAgICAgICAgKiBAcGFyYW0gX2ZpbHRlciBcbiAgICAgICAgICogQHBhcmFtIF9tZXNzYWdlIFxuICAgICAgICAgKiBAcGFyYW0gX2FyZ3MgXG4gICAgICAgICAqL1xuICAgICAgICBwcml2YXRlIHN0YXRpYyBkZWxlZ2F0ZShfZmlsdGVyOiBERUJVR19GSUxURVIsIF9tZXNzYWdlOiBPYmplY3QsIF9hcmdzOiBPYmplY3RbXSk6IHZvaWQge1xuICAgICAgICAgICAgbGV0IGRlbGVnYXRlczogTWFwRGVidWdUYXJnZXRUb0RlbGVnYXRlID0gRGVidWcuZGVsZWdhdGVzW19maWx0ZXJdO1xuICAgICAgICAgICAgZm9yIChsZXQgZGVsZWdhdGUgb2YgZGVsZWdhdGVzLnZhbHVlcygpKVxuICAgICAgICAgICAgICAgIGlmIChfYXJncy5sZW5ndGggPiAwKVxuICAgICAgICAgICAgICAgICAgICBkZWxlZ2F0ZShfbWVzc2FnZSwgLi4uX2FyZ3MpO1xuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgZGVsZWdhdGUoX21lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfVxufSIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJEZWJ1Z1RhcmdldC50c1wiLz5cbm5hbWVzcGFjZSBGdWRnZUNvcmUge1xuICAgIC8qKlxuICAgICAqIFJvdXRpbmcgdG8gYSBIVE1MRGlhbG9nRWxlbWVudFxuICAgICAqL1xuICAgIGV4cG9ydCBjbGFzcyBEZWJ1Z0RpYWxvZyBleHRlbmRzIERlYnVnVGFyZ2V0IHtcbiAgICAgICAgLy8gVE9ETzogY2hlY2tvdXQgSFRNTERpYWxvZ0VsZW1lbnQ7ICEhIVxuICAgIH1cbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiRGVidWdUYXJnZXQudHNcIi8+XG5uYW1lc3BhY2UgRnVkZ2VDb3JlIHtcbiAgICAvKipcbiAgICAgKiBSb3V0ZSB0byBhbiBIVE1MVGV4dEFyZWEsIG1heSBiZSBvYnNvbGV0ZSB3aGVuIHVzaW5nIEhUTUxEaWFsb2dFbGVtZW50XG4gICAgICovXG4gICAgZXhwb3J0IGNsYXNzIERlYnVnVGV4dEFyZWEgZXh0ZW5kcyBEZWJ1Z1RhcmdldCB7XG4gICAgICAgIHB1YmxpYyBzdGF0aWMgdGV4dEFyZWE6IEhUTUxUZXh0QXJlYUVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwidGV4dGFyZWFcIik7XG4gICAgICAgIHB1YmxpYyBzdGF0aWMgZGVsZWdhdGVzOiBNYXBEZWJ1Z0ZpbHRlclRvRGVsZWdhdGUgPSB7XG4gICAgICAgICAgICBbREVCVUdfRklMVEVSLklORk9dOiBEZWJ1Z0FsZXJ0LmNyZWF0ZURlbGVnYXRlKFwiSW5mb1wiKVxuICAgICAgICB9O1xuICAgICAgICBwdWJsaWMgc3RhdGljIGNyZWF0ZURlbGVnYXRlKF9oZWFkbGluZTogc3RyaW5nKTogRnVuY3Rpb24ge1xuICAgICAgICAgICAgbGV0IGRlbGVnYXRlOiBGdW5jdGlvbiA9IGZ1bmN0aW9uIChfbWVzc2FnZTogT2JqZWN0LCAuLi5fYXJnczogT2JqZWN0W10pOiB2b2lkIHtcbiAgICAgICAgICAgICAgICBsZXQgb3V0OiBzdHJpbmcgPSBfaGVhZGxpbmUgKyBcIlxcblxcblwiICsgRGVidWdUYXJnZXQubWVyZ2VBcmd1bWVudHMoX21lc3NhZ2UsIF9hcmdzKTtcbiAgICAgICAgICAgICAgICBEZWJ1Z1RleHRBcmVhLnRleHRBcmVhLnRleHRDb250ZW50ICs9IG91dDtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gZGVsZWdhdGU7XG4gICAgICAgIH1cbiAgICB9XG59IiwibmFtZXNwYWNlIEZ1ZGdlQ29yZSB7XG4gICAgLyoqXG4gICAgICogRGVmaW5lcyBhIGNvbG9yIGFzIHZhbHVlcyBpbiB0aGUgcmFuZ2Ugb2YgMCB0byAxIGZvciB0aGUgZm91ciBjaGFubmVscyByZWQsIGdyZWVuLCBibHVlIGFuZCBhbHBoYSAoZm9yIG9wYWNpdHkpXG4gICAgICovXG4gICAgZXhwb3J0IGNsYXNzIENvbG9yIGV4dGVuZHMgTXV0YWJsZSB7IC8vaW1wbGVtZW50cyBTZXJpYWxpemFibGUge1xuICAgICAgICBwdWJsaWMgcjogbnVtYmVyO1xuICAgICAgICBwdWJsaWMgZzogbnVtYmVyO1xuICAgICAgICBwdWJsaWMgYjogbnVtYmVyO1xuICAgICAgICBwdWJsaWMgYTogbnVtYmVyO1xuXG4gICAgICAgIGNvbnN0cnVjdG9yKF9yOiBudW1iZXIgPSAxLCBfZzogbnVtYmVyID0gMSwgX2I6IG51bWJlciA9IDEsIF9hOiBudW1iZXIgPSAxKSB7XG4gICAgICAgICAgICBzdXBlcigpO1xuICAgICAgICAgICAgdGhpcy5zZXROb3JtUkdCQShfciwgX2csIF9iLCBfYSk7XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgc3RhdGljIGdldCBCTEFDSygpOiBDb2xvciB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IENvbG9yKDAsIDAsIDAsIDEpO1xuICAgICAgICB9XG4gICAgICAgIHB1YmxpYyBzdGF0aWMgZ2V0IFdISVRFKCk6IENvbG9yIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgQ29sb3IoMSwgMSwgMSwgMSk7XG4gICAgICAgIH1cbiAgICAgICAgcHVibGljIHN0YXRpYyBnZXQgUkVEKCk6IENvbG9yIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgQ29sb3IoMSwgMCwgMCwgMSk7XG4gICAgICAgIH1cbiAgICAgICAgcHVibGljIHN0YXRpYyBnZXQgR1JFRU4oKTogQ29sb3Ige1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBDb2xvcigwLCAxLCAwLCAxKTtcbiAgICAgICAgfVxuICAgICAgICBwdWJsaWMgc3RhdGljIGdldCBCTFVFKCk6IENvbG9yIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgQ29sb3IoMCwgMCwgMSwgMSk7XG4gICAgICAgIH1cbiAgICAgICAgcHVibGljIHN0YXRpYyBnZXQgWUVMTE9XKCk6IENvbG9yIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgQ29sb3IoMSwgMSwgMCwgMSk7XG4gICAgICAgIH1cbiAgICAgICAgcHVibGljIHN0YXRpYyBnZXQgQ1lBTigpOiBDb2xvciB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IENvbG9yKDAsIDEsIDEsIDEpO1xuICAgICAgICB9XG4gICAgICAgIHB1YmxpYyBzdGF0aWMgZ2V0IE1BR0VOVEEoKTogQ29sb3Ige1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBDb2xvcigxLCAwLCAxLCAxKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHB1YmxpYyBzZXROb3JtUkdCQShfcjogbnVtYmVyLCBfZzogbnVtYmVyLCBfYjogbnVtYmVyLCBfYTogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgICAgICB0aGlzLnIgPSBNYXRoLm1pbigxLCBNYXRoLm1heCgwLCBfcikpO1xuICAgICAgICAgICAgdGhpcy5nID0gTWF0aC5taW4oMSwgTWF0aC5tYXgoMCwgX2cpKTtcbiAgICAgICAgICAgIHRoaXMuYiA9IE1hdGgubWluKDEsIE1hdGgubWF4KDAsIF9iKSk7XG4gICAgICAgICAgICB0aGlzLmEgPSBNYXRoLm1pbigxLCBNYXRoLm1heCgwLCBfYSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgcHVibGljIHNldEJ5dGVzUkdCQShfcjogbnVtYmVyLCBfZzogbnVtYmVyLCBfYjogbnVtYmVyLCBfYTogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgICAgICB0aGlzLnNldE5vcm1SR0JBKF9yIC8gMjU1LCBfZyAvIDI1NSwgX2IgLyAyNTUsIF9hIC8gMjU1KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHB1YmxpYyBnZXRBcnJheSgpOiBGbG9hdDMyQXJyYXkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBGbG9hdDMyQXJyYXkoW3RoaXMuciwgdGhpcy5nLCB0aGlzLmIsIHRoaXMuYV0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcHVibGljIHNldEFycmF5Tm9ybVJHQkEoX2NvbG9yOiBGbG9hdDMyQXJyYXkpOiB2b2lkIHtcbiAgICAgICAgICAgIHRoaXMuc2V0Tm9ybVJHQkEoX2NvbG9yWzBdLCBfY29sb3JbMV0sIF9jb2xvclsyXSwgX2NvbG9yWzNdKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHB1YmxpYyBzZXRBcnJheUJ5dGVzUkdCQShfY29sb3I6IFVpbnQ4Q2xhbXBlZEFycmF5KTogdm9pZCB7XG4gICAgICAgICAgICB0aGlzLnNldEJ5dGVzUkdCQShfY29sb3JbMF0sIF9jb2xvclsxXSwgX2NvbG9yWzJdLCBfY29sb3JbM10pO1xuICAgICAgICB9XG5cbiAgICAgICAgcHJvdGVjdGVkIHJlZHVjZU11dGF0b3IoX211dGF0b3I6IE11dGF0b3IpOiB2b2lkIHsvKiogKi8gfVxuICAgIH1cbn0iLCJuYW1lc3BhY2UgRnVkZ2VDb3JlIHtcbiAgICAvKipcbiAgICAgKiBCYXNlY2xhc3MgZm9yIG1hdGVyaWFscy4gQ29tYmluZXMgYSBbW1NoYWRlcl1dIHdpdGggYSBjb21wYXRpYmxlIFtbQ29hdF1dXG4gICAgICogQGF1dGhvcnMgSmlya2EgRGVsbCdPcm8tRnJpZWRsLCBIRlUsIDIwMTlcbiAgICAgKi9cbiAgICBleHBvcnQgY2xhc3MgTWF0ZXJpYWwgaW1wbGVtZW50cyBTZXJpYWxpemFibGVSZXNvdXJjZSB7XG4gICAgICAgIC8qKiBUaGUgbmFtZSB0byBjYWxsIHRoZSBNYXRlcmlhbCBieS4gKi9cbiAgICAgICAgcHVibGljIG5hbWU6IHN0cmluZztcbiAgICAgICAgcHVibGljIGlkUmVzb3VyY2U6IHN0cmluZyA9IHVuZGVmaW5lZDtcbiAgICAgICAgcHJpdmF0ZSBzaGFkZXJUeXBlOiB0eXBlb2YgU2hhZGVyOyAvLyBUaGUgc2hhZGVyIHByb2dyYW0gdXNlZCBieSB0aGlzIEJhc2VNYXRlcmlhbFxuICAgICAgICBwcml2YXRlIGNvYXQ6IENvYXQ7XG5cbiAgICAgICAgcHVibGljIGNvbnN0cnVjdG9yKF9uYW1lOiBzdHJpbmcsIF9zaGFkZXI/OiB0eXBlb2YgU2hhZGVyLCBfY29hdD86IENvYXQpIHtcbiAgICAgICAgICAgIHRoaXMubmFtZSA9IF9uYW1lO1xuICAgICAgICAgICAgdGhpcy5zaGFkZXJUeXBlID0gX3NoYWRlcjtcbiAgICAgICAgICAgIGlmIChfc2hhZGVyKSB7XG4gICAgICAgICAgICAgICAgaWYgKF9jb2F0KVxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldENvYXQoX2NvYXQpO1xuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRDb2F0KHRoaXMuY3JlYXRlQ29hdE1hdGNoaW5nU2hhZGVyKCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENyZWF0ZXMgYSBuZXcgW1tDb2F0XV0gaW5zdGFuY2UgdGhhdCBpcyB2YWxpZCBmb3IgdGhlIFtbU2hhZGVyXV0gcmVmZXJlbmNlZCBieSB0aGlzIG1hdGVyaWFsXG4gICAgICAgICAqL1xuICAgICAgICBwdWJsaWMgY3JlYXRlQ29hdE1hdGNoaW5nU2hhZGVyKCk6IENvYXQge1xuICAgICAgICAgICAgbGV0IGNvYXQ6IENvYXQgPSBuZXcgKHRoaXMuc2hhZGVyVHlwZS5nZXRDb2F0KCkpKCk7XG4gICAgICAgICAgICByZXR1cm4gY29hdDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBNYWtlcyB0aGlzIG1hdGVyaWFsIHJlZmVyZW5jZSB0aGUgZ2l2ZW4gW1tDb2F0XV0gaWYgaXQgaXMgY29tcGF0aWJsZSB3aXRoIHRoZSByZWZlcmVuY2VkIFtbU2hhZGVyXV1cbiAgICAgICAgICogQHBhcmFtIF9jb2F0IFxuICAgICAgICAgKi9cbiAgICAgICAgcHVibGljIHNldENvYXQoX2NvYXQ6IENvYXQpOiB2b2lkIHtcbiAgICAgICAgICAgIGlmIChfY29hdC5jb25zdHJ1Y3RvciAhPSB0aGlzLnNoYWRlclR5cGUuZ2V0Q29hdCgpKVxuICAgICAgICAgICAgICAgIHRocm93IChuZXcgRXJyb3IoXCJTaGFkZXIgYW5kIGNvYXQgZG9uJ3QgbWF0Y2hcIikpO1xuICAgICAgICAgICAgdGhpcy5jb2F0ID0gX2NvYXQ7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogUmV0dXJucyB0aGUgY3VycmVudGx5IHJlZmVyZW5jZWQgW1tDb2F0XV0gaW5zdGFuY2VcbiAgICAgICAgICovXG4gICAgICAgIHB1YmxpYyBnZXRDb2F0KCk6IENvYXQge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29hdDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDaGFuZ2VzIHRoZSBtYXRlcmlhbHMgcmVmZXJlbmNlIHRvIHRoZSBnaXZlbiBbW1NoYWRlcl1dLCBjcmVhdGVzIGFuZCByZWZlcmVuY2VzIGEgbmV3IFtbQ29hdF1dIGluc3RhbmNlICBcbiAgICAgICAgICogYW5kIG11dGF0ZXMgdGhlIG5ldyBjb2F0IHRvIHByZXNlcnZlIG1hdGNoaW5nIHByb3BlcnRpZXMuXG4gICAgICAgICAqIEBwYXJhbSBfc2hhZGVyVHlwZSBcbiAgICAgICAgICovXG4gICAgICAgIHB1YmxpYyBzZXRTaGFkZXIoX3NoYWRlclR5cGU6IHR5cGVvZiBTaGFkZXIpOiB2b2lkIHtcbiAgICAgICAgICAgIHRoaXMuc2hhZGVyVHlwZSA9IF9zaGFkZXJUeXBlO1xuICAgICAgICAgICAgbGV0IGNvYXQ6IENvYXQgPSB0aGlzLmNyZWF0ZUNvYXRNYXRjaGluZ1NoYWRlcigpO1xuICAgICAgICAgICAgY29hdC5tdXRhdGUodGhpcy5jb2F0LmdldE11dGF0b3IoKSk7XG4gICAgICAgICAgICB0aGlzLnNldENvYXQoY29hdCk7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogUmV0dXJucyB0aGUgW1tTaGFkZXJdXSByZWZlcmVuY2VkIGJ5IHRoaXMgbWF0ZXJpYWxcbiAgICAgICAgICovXG4gICAgICAgIHB1YmxpYyBnZXRTaGFkZXIoKTogdHlwZW9mIFNoYWRlciB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zaGFkZXJUeXBlO1xuICAgICAgICB9XG5cblxuICAgICAgICAvLyNyZWdpb24gVHJhbnNmZXJcbiAgICAgICAgLy8gVE9ETzogdGhpcyB0eXBlIG9mIHNlcmlhbGl6YXRpb24gd2FzIGltcGxlbWVudGVkIGZvciBpbXBsaWNpdCBNYXRlcmlhbCBjcmVhdGUuIENoZWNrIGlmIG9ic29sZXRlIHdoZW4gb25seSBvbmUgbWF0ZXJpYWwgY2xhc3MgZXhpc3RzIGFuZC9vciBtYXRlcmlhbHMgYXJlIHN0b3JlZCBzZXBhcmF0ZWx5XG4gICAgICAgIHB1YmxpYyBzZXJpYWxpemUoKTogU2VyaWFsaXphdGlvbiB7XG4gICAgICAgICAgICBsZXQgc2VyaWFsaXphdGlvbjogU2VyaWFsaXphdGlvbiA9IHtcbiAgICAgICAgICAgICAgICBuYW1lOiB0aGlzLm5hbWUsXG4gICAgICAgICAgICAgICAgaWRSZXNvdXJjZTogdGhpcy5pZFJlc291cmNlLFxuICAgICAgICAgICAgICAgIHNoYWRlcjogdGhpcy5zaGFkZXJUeXBlLm5hbWUsXG4gICAgICAgICAgICAgICAgY29hdDogU2VyaWFsaXplci5zZXJpYWxpemUodGhpcy5jb2F0KVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiBzZXJpYWxpemF0aW9uO1xuICAgICAgICB9XG4gICAgICAgIHB1YmxpYyBkZXNlcmlhbGl6ZShfc2VyaWFsaXphdGlvbjogU2VyaWFsaXphdGlvbik6IFNlcmlhbGl6YWJsZSB7XG4gICAgICAgICAgICB0aGlzLm5hbWUgPSBfc2VyaWFsaXphdGlvbi5uYW1lO1xuICAgICAgICAgICAgdGhpcy5pZFJlc291cmNlID0gX3NlcmlhbGl6YXRpb24uaWRSZXNvdXJjZTtcbiAgICAgICAgICAgIC8vIFRPRE86IHByb3ZpZGUgZm9yIHNoYWRlcnMgaW4gdGhlIHVzZXJzIG5hbWVzcGFjZS4gU2VlIFNlcmlhbGl6ZXIgZnVsbHBhdGggZXRjLlxuICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1hbnlcbiAgICAgICAgICAgIHRoaXMuc2hhZGVyVHlwZSA9ICg8YW55PkZ1ZGdlQ29yZSlbX3NlcmlhbGl6YXRpb24uc2hhZGVyXTtcbiAgICAgICAgICAgIGxldCBjb2F0OiBDb2F0ID0gPENvYXQ+U2VyaWFsaXplci5kZXNlcmlhbGl6ZShfc2VyaWFsaXphdGlvbi5jb2F0KTtcbiAgICAgICAgICAgIHRoaXMuc2V0Q29hdChjb2F0KTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIC8vI2VuZHJlZ2lvblxuICAgIH1cbn0iLCJuYW1lc3BhY2UgRnVkZ2VDb3JlIHtcbiAgICAvKipcbiAgICAgKiBLZWVwcyBhIGRlcG90IG9mIG9iamVjdHMgdGhhdCBoYXZlIGJlZW4gbWFya2VkIGZvciByZXVzZSwgc29ydGVkIGJ5IHR5cGUuICBcbiAgICAgKiBVc2luZyBbW1JlY3ljbGVyXV0gcmVkdWNlcyBsb2FkIG9uIHRoZSBjYXJiYWdlIGNvbGxlY3RvciBhbmQgdGh1cyBzdXBwb3J0cyBzbW9vdGggcGVyZm9ybWFuY2VcbiAgICAgKi9cbiAgICBleHBvcnQgYWJzdHJhY3QgY2xhc3MgUmVjeWNsZXIge1xuICAgICAgICBwcml2YXRlIHN0YXRpYyBkZXBvdDogeyBbdHlwZTogc3RyaW5nXTogT2JqZWN0W10gfSA9IHt9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZXR1cm5zIGFuIG9iamVjdCBvZiB0aGUgcmVxdWVzdGVkIHR5cGUgZnJvbSB0aGUgZGVwb3QsIG9yIGEgbmV3IG9uZSwgaWYgdGhlIGRlcG90IHdhcyBlbXB0eSBcbiAgICAgICAgICogQHBhcmFtIF9UIFRoZSBjbGFzcyBpZGVudGlmaWVyIG9mIHRoZSBkZXNpcmVkIG9iamVjdFxuICAgICAgICAgKi9cbiAgICAgICAgcHVibGljIHN0YXRpYyBnZXQ8VD4oX1Q6IG5ldyAoKSA9PiBUKTogVCB7XG4gICAgICAgICAgICBsZXQga2V5OiBzdHJpbmcgPSBfVC5uYW1lO1xuICAgICAgICAgICAgbGV0IGluc3RhbmNlczogT2JqZWN0W10gPSBSZWN5Y2xlci5kZXBvdFtrZXldO1xuICAgICAgICAgICAgaWYgKGluc3RhbmNlcyAmJiBpbnN0YW5jZXMubGVuZ3RoID4gMClcbiAgICAgICAgICAgICAgICByZXR1cm4gPFQ+aW5zdGFuY2VzLnBvcCgpO1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgX1QoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTdG9yZXMgdGhlIG9iamVjdCBpbiB0aGUgZGVwb3QgZm9yIGxhdGVyIHJlY3ljbGluZy4gVXNlcnMgYXJlIHJlc3BvbnNpYmxlIGZvciB0aHJvd2luZyBpbiBvYmplY3RzIHRoYXQgYXJlIGFib3V0IHRvIGxvb3NlIHNjb3BlIGFuZCBhcmUgbm90IHJlZmVyZW5jZWQgYnkgYW55IG90aGVyXG4gICAgICAgICAqIEBwYXJhbSBfaW5zdGFuY2VcbiAgICAgICAgICovXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgc3RvcmUoX2luc3RhbmNlOiBPYmplY3QpOiB2b2lkIHtcbiAgICAgICAgICAgIGxldCBrZXk6IHN0cmluZyA9IF9pbnN0YW5jZS5jb25zdHJ1Y3Rvci5uYW1lO1xuICAgICAgICAgICAgLy9EZWJ1Zy5sb2coa2V5KTtcbiAgICAgICAgICAgIGxldCBpbnN0YW5jZXM6IE9iamVjdFtdID0gUmVjeWNsZXIuZGVwb3Rba2V5XSB8fCBbXTtcbiAgICAgICAgICAgIGluc3RhbmNlcy5wdXNoKF9pbnN0YW5jZSk7XG4gICAgICAgICAgICBSZWN5Y2xlci5kZXBvdFtrZXldID0gaW5zdGFuY2VzO1xuICAgICAgICAgICAgLy8gRGVidWcubG9nKGBPYmplY3RNYW5hZ2VyLmRlcG90WyR7a2V5fV06ICR7T2JqZWN0TWFuYWdlci5kZXBvdFtrZXldLmxlbmd0aH1gKTtcbiAgICAgICAgICAgIC8vRGVidWcubG9nKHRoaXMuZGVwb3QpO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEVtcHR5cyB0aGUgZGVwb3Qgb2YgYSBnaXZlbiB0eXBlLCBsZWF2aW5nIHRoZSBvYmplY3RzIGZvciB0aGUgZ2FyYmFnZSBjb2xsZWN0b3IuIE1heSByZXN1bHQgaW4gYSBzaG9ydCBzdGFsbCB3aGVuIG1hbnkgb2JqZWN0cyB3ZXJlIGluXG4gICAgICAgICAqIEBwYXJhbSBfVFxuICAgICAgICAgKi9cbiAgICAgICAgcHVibGljIHN0YXRpYyBkdW1wPFQ+KF9UOiBuZXcgKCkgPT4gVCk6IHZvaWQge1xuICAgICAgICAgICAgbGV0IGtleTogc3RyaW5nID0gX1QubmFtZTtcbiAgICAgICAgICAgIFJlY3ljbGVyLmRlcG90W2tleV0gPSBbXTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFbXB0eXMgYWxsIGRlcG90cywgbGVhdmluZyBhbGwgb2JqZWN0cyB0byB0aGUgZ2FyYmFnZSBjb2xsZWN0b3IuIE1heSByZXN1bHQgaW4gYSBzaG9ydCBzdGFsbCB3aGVuIG1hbnkgb2JqZWN0cyB3ZXJlIGluXG4gICAgICAgICAqL1xuICAgICAgICBwdWJsaWMgc3RhdGljIGR1bXBBbGwoKTogdm9pZCB7XG4gICAgICAgICAgICBSZWN5Y2xlci5kZXBvdCA9IHt9O1xuICAgICAgICB9XG4gICAgfVxufSIsIm5hbWVzcGFjZSBGdWRnZUNvcmUge1xuICAgIGV4cG9ydCBpbnRlcmZhY2UgU2VyaWFsaXphYmxlUmVzb3VyY2UgZXh0ZW5kcyBTZXJpYWxpemFibGUge1xuICAgICAgICBpZFJlc291cmNlOiBzdHJpbmc7XG4gICAgfVxuXG4gICAgZXhwb3J0IGludGVyZmFjZSBSZXNvdXJjZXMge1xuICAgICAgICBbaWRSZXNvdXJjZTogc3RyaW5nXTogU2VyaWFsaXphYmxlUmVzb3VyY2U7XG4gICAgfVxuXG4gICAgZXhwb3J0IGludGVyZmFjZSBTZXJpYWxpemF0aW9uT2ZSZXNvdXJjZXMge1xuICAgICAgICBbaWRSZXNvdXJjZTogc3RyaW5nXTogU2VyaWFsaXphdGlvbjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTdGF0aWMgY2xhc3MgaGFuZGxpbmcgdGhlIHJlc291cmNlcyB1c2VkIHdpdGggdGhlIGN1cnJlbnQgRlVER0UtaW5zdGFuY2UuICBcbiAgICAgKiBLZWVwcyBhIGxpc3Qgb2YgdGhlIHJlc291cmNlcyBhbmQgZ2VuZXJhdGVzIGlkcyB0byByZXRyaWV2ZSB0aGVtLiAgXG4gICAgICogUmVzb3VyY2VzIGFyZSBvYmplY3RzIHJlZmVyZW5jZWQgbXVsdGlwbGUgdGltZXMgYnV0IHN1cHBvc2VkIHRvIGJlIHN0b3JlZCBvbmx5IG9uY2VcbiAgICAgKi9cbiAgICBleHBvcnQgYWJzdHJhY3QgY2xhc3MgUmVzb3VyY2VNYW5hZ2VyIHtcbiAgICAgICAgcHVibGljIHN0YXRpYyByZXNvdXJjZXM6IFJlc291cmNlcyA9IHt9O1xuICAgICAgICBwdWJsaWMgc3RhdGljIHNlcmlhbGl6YXRpb246IFNlcmlhbGl6YXRpb25PZlJlc291cmNlcyA9IG51bGw7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEdlbmVyYXRlcyBhbiBpZCBmb3IgdGhlIHJlc291cmNlcyBhbmQgcmVnaXN0ZXJzIGl0IHdpdGggdGhlIGxpc3Qgb2YgcmVzb3VyY2VzIFxuICAgICAgICAgKiBAcGFyYW0gX3Jlc291cmNlIFxuICAgICAgICAgKi9cbiAgICAgICAgcHVibGljIHN0YXRpYyByZWdpc3RlcihfcmVzb3VyY2U6IFNlcmlhbGl6YWJsZVJlc291cmNlKTogdm9pZCB7XG4gICAgICAgICAgICBpZiAoIV9yZXNvdXJjZS5pZFJlc291cmNlKVxuICAgICAgICAgICAgICAgIF9yZXNvdXJjZS5pZFJlc291cmNlID0gUmVzb3VyY2VNYW5hZ2VyLmdlbmVyYXRlSWQoX3Jlc291cmNlKTtcbiAgICAgICAgICAgIFJlc291cmNlTWFuYWdlci5yZXNvdXJjZXNbX3Jlc291cmNlLmlkUmVzb3VyY2VdID0gX3Jlc291cmNlO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEdlbmVyYXRlIGEgdXNlciByZWFkYWJsZSBhbmQgdW5pcXVlIGlkIHVzaW5nIHRoZSB0eXBlIG9mIHRoZSByZXNvdXJjZSwgdGhlIGRhdGUgYW5kIHJhbmRvbSBudW1iZXJzXG4gICAgICAgICAqIEBwYXJhbSBfcmVzb3VyY2VcbiAgICAgICAgICovXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgZ2VuZXJhdGVJZChfcmVzb3VyY2U6IFNlcmlhbGl6YWJsZVJlc291cmNlKTogc3RyaW5nIHtcbiAgICAgICAgICAgIC8vIFRPRE86IGJ1aWxkIGlkIGFuZCBpbnRlZ3JhdGUgaW5mbyBmcm9tIHJlc291cmNlLCBub3QganVzdCBkYXRlXG4gICAgICAgICAgICBsZXQgaWRSZXNvdXJjZTogc3RyaW5nO1xuICAgICAgICAgICAgZG9cbiAgICAgICAgICAgICAgICBpZFJlc291cmNlID0gX3Jlc291cmNlLmNvbnN0cnVjdG9yLm5hbWUgKyBcInxcIiArIG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSArIFwifFwiICsgTWF0aC5yYW5kb20oKS50b1ByZWNpc2lvbig1KS5zdWJzdHIoMiwgNSk7XG4gICAgICAgICAgICB3aGlsZSAoUmVzb3VyY2VNYW5hZ2VyLnJlc291cmNlc1tpZFJlc291cmNlXSk7XG4gICAgICAgICAgICByZXR1cm4gaWRSZXNvdXJjZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUZXN0cywgaWYgYW4gb2JqZWN0IGlzIGEgW1tTZXJpYWxpemFibGVSZXNvdXJjZV1dXG4gICAgICAgICAqIEBwYXJhbSBfb2JqZWN0IFRoZSBvYmplY3QgdG8gZXhhbWluZVxuICAgICAgICAgKi9cbiAgICAgICAgcHVibGljIHN0YXRpYyBpc1Jlc291cmNlKF9vYmplY3Q6IFNlcmlhbGl6YWJsZSk6IGJvb2xlYW4ge1xuICAgICAgICAgICAgcmV0dXJuIChSZWZsZWN0Lmhhcyhfb2JqZWN0LCBcImlkUmVzb3VyY2VcIikpO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJldHJpZXZlcyB0aGUgcmVzb3VyY2Ugc3RvcmVkIHdpdGggdGhlIGdpdmVuIGlkXG4gICAgICAgICAqIEBwYXJhbSBfaWRSZXNvdXJjZVxuICAgICAgICAgKi9cbiAgICAgICAgcHVibGljIHN0YXRpYyBnZXQoX2lkUmVzb3VyY2U6IHN0cmluZyk6IFNlcmlhbGl6YWJsZVJlc291cmNlIHtcbiAgICAgICAgICAgIGxldCByZXNvdXJjZTogU2VyaWFsaXphYmxlUmVzb3VyY2UgPSBSZXNvdXJjZU1hbmFnZXIucmVzb3VyY2VzW19pZFJlc291cmNlXTtcbiAgICAgICAgICAgIGlmICghcmVzb3VyY2UpIHtcbiAgICAgICAgICAgICAgICBsZXQgc2VyaWFsaXphdGlvbjogU2VyaWFsaXphdGlvbiA9IFJlc291cmNlTWFuYWdlci5zZXJpYWxpemF0aW9uW19pZFJlc291cmNlXTtcbiAgICAgICAgICAgICAgICBpZiAoIXNlcmlhbGl6YXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgRGVidWcuZXJyb3IoXCJSZXNvdXJjZSBub3QgZm91bmRcIiwgX2lkUmVzb3VyY2UpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzb3VyY2UgPSBSZXNvdXJjZU1hbmFnZXIuZGVzZXJpYWxpemVSZXNvdXJjZShzZXJpYWxpemF0aW9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXNvdXJjZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDcmVhdGVzIGFuZCByZWdpc3RlcnMgYSByZXNvdXJjZSBmcm9tIGEgW1tOb2RlXV0sIGNvcHlpbmcgdGhlIGNvbXBsZXRlIGJyYW5jaCBzdGFydGluZyB3aXRoIGl0XG4gICAgICAgICAqIEBwYXJhbSBfbm9kZSBBIG5vZGUgdG8gY3JlYXRlIHRoZSByZXNvdXJjZSBmcm9tXG4gICAgICAgICAqIEBwYXJhbSBfcmVwbGFjZVdpdGhJbnN0YW5jZSBpZiB0cnVlIChkZWZhdWx0KSwgdGhlIG5vZGUgdXNlZCBhcyBvcmlnaW4gaXMgcmVwbGFjZWQgYnkgYSBbW05vZGVSZXNvdXJjZUluc3RhbmNlXV0gb2YgdGhlIFtbTm9kZVJlc291cmNlXV0gY3JlYXRlZFxuICAgICAgICAgKi9cbiAgICAgICAgcHVibGljIHN0YXRpYyByZWdpc3Rlck5vZGVBc1Jlc291cmNlKF9ub2RlOiBOb2RlLCBfcmVwbGFjZVdpdGhJbnN0YW5jZTogYm9vbGVhbiA9IHRydWUpOiBOb2RlUmVzb3VyY2Uge1xuICAgICAgICAgICAgbGV0IHNlcmlhbGl6YXRpb246IFNlcmlhbGl6YXRpb24gPSBfbm9kZS5zZXJpYWxpemUoKTtcbiAgICAgICAgICAgIGxldCBub2RlUmVzb3VyY2U6IE5vZGVSZXNvdXJjZSA9IG5ldyBOb2RlUmVzb3VyY2UoXCJOb2RlUmVzb3VyY2VcIik7XG4gICAgICAgICAgICBub2RlUmVzb3VyY2UuZGVzZXJpYWxpemUoc2VyaWFsaXphdGlvbik7XG4gICAgICAgICAgICBSZXNvdXJjZU1hbmFnZXIucmVnaXN0ZXIobm9kZVJlc291cmNlKTtcblxuICAgICAgICAgICAgaWYgKF9yZXBsYWNlV2l0aEluc3RhbmNlICYmIF9ub2RlLmdldFBhcmVudCgpKSB7XG4gICAgICAgICAgICAgICAgbGV0IGluc3RhbmNlOiBOb2RlUmVzb3VyY2VJbnN0YW5jZSA9IG5ldyBOb2RlUmVzb3VyY2VJbnN0YW5jZShub2RlUmVzb3VyY2UpO1xuICAgICAgICAgICAgICAgIF9ub2RlLmdldFBhcmVudCgpLnJlcGxhY2VDaGlsZChfbm9kZSwgaW5zdGFuY2UpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gbm9kZVJlc291cmNlO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNlcmlhbGl6ZSBhbGwgcmVzb3VyY2VzXG4gICAgICAgICAqL1xuICAgICAgICBwdWJsaWMgc3RhdGljIHNlcmlhbGl6ZSgpOiBTZXJpYWxpemF0aW9uT2ZSZXNvdXJjZXMge1xuICAgICAgICAgICAgbGV0IHNlcmlhbGl6YXRpb246IFNlcmlhbGl6YXRpb25PZlJlc291cmNlcyA9IHt9O1xuICAgICAgICAgICAgZm9yIChsZXQgaWRSZXNvdXJjZSBpbiBSZXNvdXJjZU1hbmFnZXIucmVzb3VyY2VzKSB7XG4gICAgICAgICAgICAgICAgbGV0IHJlc291cmNlOiBTZXJpYWxpemFibGVSZXNvdXJjZSA9IFJlc291cmNlTWFuYWdlci5yZXNvdXJjZXNbaWRSZXNvdXJjZV07XG4gICAgICAgICAgICAgICAgaWYgKGlkUmVzb3VyY2UgIT0gcmVzb3VyY2UuaWRSZXNvdXJjZSlcbiAgICAgICAgICAgICAgICAgICAgRGVidWcuZXJyb3IoXCJSZXNvdXJjZS1pZCBtaXNtYXRjaFwiLCByZXNvdXJjZSk7XG4gICAgICAgICAgICAgICAgc2VyaWFsaXphdGlvbltpZFJlc291cmNlXSA9IFNlcmlhbGl6ZXIuc2VyaWFsaXplKHJlc291cmNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBzZXJpYWxpemF0aW9uO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENyZWF0ZSByZXNvdXJjZXMgZnJvbSBhIHNlcmlhbGl6YXRpb24sIGRlbGV0aW5nIGFsbCByZXNvdXJjZXMgcHJldmlvdXNseSByZWdpc3RlcmVkXG4gICAgICAgICAqIEBwYXJhbSBfc2VyaWFsaXphdGlvbiBcbiAgICAgICAgICovXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgZGVzZXJpYWxpemUoX3NlcmlhbGl6YXRpb246IFNlcmlhbGl6YXRpb25PZlJlc291cmNlcyk6IFJlc291cmNlcyB7XG4gICAgICAgICAgICBSZXNvdXJjZU1hbmFnZXIuc2VyaWFsaXphdGlvbiA9IF9zZXJpYWxpemF0aW9uO1xuICAgICAgICAgICAgUmVzb3VyY2VNYW5hZ2VyLnJlc291cmNlcyA9IHt9O1xuICAgICAgICAgICAgZm9yIChsZXQgaWRSZXNvdXJjZSBpbiBfc2VyaWFsaXphdGlvbikge1xuICAgICAgICAgICAgICAgIGxldCBzZXJpYWxpemF0aW9uOiBTZXJpYWxpemF0aW9uID0gX3NlcmlhbGl6YXRpb25baWRSZXNvdXJjZV07XG4gICAgICAgICAgICAgICAgbGV0IHJlc291cmNlOiBTZXJpYWxpemFibGVSZXNvdXJjZSA9IFJlc291cmNlTWFuYWdlci5kZXNlcmlhbGl6ZVJlc291cmNlKHNlcmlhbGl6YXRpb24pO1xuICAgICAgICAgICAgICAgIGlmIChyZXNvdXJjZSlcbiAgICAgICAgICAgICAgICAgICAgUmVzb3VyY2VNYW5hZ2VyLnJlc291cmNlc1tpZFJlc291cmNlXSA9IHJlc291cmNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIFJlc291cmNlTWFuYWdlci5yZXNvdXJjZXM7XG4gICAgICAgIH1cblxuICAgICAgICBwcml2YXRlIHN0YXRpYyBkZXNlcmlhbGl6ZVJlc291cmNlKF9zZXJpYWxpemF0aW9uOiBTZXJpYWxpemF0aW9uKTogU2VyaWFsaXphYmxlUmVzb3VyY2Uge1xuICAgICAgICAgICAgcmV0dXJuIDxTZXJpYWxpemFibGVSZXNvdXJjZT5TZXJpYWxpemVyLmRlc2VyaWFsaXplKF9zZXJpYWxpemF0aW9uKTtcbiAgICAgICAgfVxuICAgIH1cbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vTGlnaHQvTGlnaHQudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vQ29tcG9uZW50L0NvbXBvbmVudExpZ2h0LnRzXCIvPlxubmFtZXNwYWNlIEZ1ZGdlQ29yZSB7XG4gICAgZXhwb3J0IHR5cGUgTWFwTGlnaHRUeXBlVG9MaWdodExpc3QgPSBNYXA8c3RyaW5nLCBDb21wb25lbnRMaWdodFtdPjtcbiAgICAvKipcbiAgICAgKiBDb250cm9scyB0aGUgcmVuZGVyaW5nIG9mIGEgYnJhbmNoIG9mIGEgc2NlbmV0cmVlLCB1c2luZyB0aGUgZ2l2ZW4gW1tDb21wb25lbnRDYW1lcmFdXSxcbiAgICAgKiBhbmQgdGhlIHByb3BhZ2F0aW9uIG9mIHRoZSByZW5kZXJlZCBpbWFnZSBmcm9tIHRoZSBvZmZzY3JlZW4gcmVuZGVyYnVmZmVyIHRvIHRoZSB0YXJnZXQgY2FudmFzXG4gICAgICogdGhyb3VnaCBhIHNlcmllcyBvZiBbW0ZyYW1pbmddXSBvYmplY3RzLiBUaGUgc3RhZ2VzIGludm9sdmVkIGFyZSBpbiBvcmRlciBvZiByZW5kZXJpbmdcbiAgICAgKiBbW1JlbmRlck1hbmFnZXJdXS52aWV3cG9ydCAtPiBbW1ZpZXdwb3J0XV0uc291cmNlIC0+IFtbVmlld3BvcnRdXS5kZXN0aW5hdGlvbiAtPiBET00tQ2FudmFzIC0+IENsaWVudChDU1MpXG4gICAgICogQGF1dGhvcnMgSmFzY2hhIEthcmFnw7ZsLCBIRlUsIDIwMTkgfCBKaXJrYSBEZWxsJ09yby1GcmllZGwsIEhGVSwgMjAxOVxuICAgICAqL1xuICAgIGV4cG9ydCBjbGFzcyBWaWV3cG9ydCBleHRlbmRzIEV2ZW50VGFyZ2V0IHtcbiAgICAgICAgcHJpdmF0ZSBzdGF0aWMgZm9jdXM6IFZpZXdwb3J0O1xuXG4gICAgICAgIHB1YmxpYyBuYW1lOiBzdHJpbmcgPSBcIlZpZXdwb3J0XCI7IC8vIFRoZSBuYW1lIHRvIGNhbGwgdGhpcyB2aWV3cG9ydCBieS5cbiAgICAgICAgcHVibGljIGNhbWVyYTogQ29tcG9uZW50Q2FtZXJhID0gbnVsbDsgLy8gVGhlIGNhbWVyYSByZXByZXNlbnRpbmcgdGhlIHZpZXcgcGFyYW1ldGVycyB0byByZW5kZXIgdGhlIGJyYW5jaC5cblxuICAgICAgICBwdWJsaWMgcmVjdFNvdXJjZTogUmVjdGFuZ2xlO1xuICAgICAgICBwdWJsaWMgcmVjdERlc3RpbmF0aW9uOiBSZWN0YW5nbGU7XG5cbiAgICAgICAgLy8gVE9ETzogdmVyaWZ5IGlmIGNsaWVudCB0byBjYW52YXMgc2hvdWxkIGJlIGluIFZpZXdwb3J0IG9yIHNvbWV3aGVyZSBlbHNlIChXaW5kb3csIENvbnRhaW5lcj8pXG4gICAgICAgIC8vIE11bHRpcGxlIHZpZXdwb3J0cyB1c2luZyB0aGUgc2FtZSBjYW52YXMgc2hvdWxkbid0IGRpZmZlciBoZXJlLi4uXG4gICAgICAgIC8vIGRpZmZlcmVudCBmcmFtaW5nIG1ldGhvZHMgY2FuIGJlIHVzZWQsIHRoaXMgaXMgdGhlIGRlZmF1bHRcbiAgICAgICAgcHVibGljIGZyYW1lQ2xpZW50VG9DYW52YXM6IEZyYW1pbmdTY2FsZWQgPSBuZXcgRnJhbWluZ1NjYWxlZCgpO1xuICAgICAgICBwdWJsaWMgZnJhbWVDYW52YXNUb0Rlc3RpbmF0aW9uOiBGcmFtaW5nQ29tcGxleCA9IG5ldyBGcmFtaW5nQ29tcGxleCgpO1xuICAgICAgICBwdWJsaWMgZnJhbWVEZXN0aW5hdGlvblRvU291cmNlOiBGcmFtaW5nU2NhbGVkID0gbmV3IEZyYW1pbmdTY2FsZWQoKTtcbiAgICAgICAgcHVibGljIGZyYW1lU291cmNlVG9SZW5kZXI6IEZyYW1pbmdTY2FsZWQgPSBuZXcgRnJhbWluZ1NjYWxlZCgpO1xuXG4gICAgICAgIHB1YmxpYyBhZGp1c3RpbmdGcmFtZXM6IGJvb2xlYW4gPSB0cnVlO1xuICAgICAgICBwdWJsaWMgYWRqdXN0aW5nQ2FtZXJhOiBib29sZWFuID0gdHJ1ZTtcblxuICAgICAgICBwdWJsaWMgbGlnaHRzOiBNYXBMaWdodFR5cGVUb0xpZ2h0TGlzdCA9IG51bGw7XG5cbiAgICAgICAgcHJpdmF0ZSBicmFuY2g6IE5vZGUgPSBudWxsOyAvLyBUaGUgZmlyc3Qgbm9kZSBpbiB0aGUgdHJlZShicmFuY2gpIHRoYXQgd2lsbCBiZSByZW5kZXJlZC5cbiAgICAgICAgcHJpdmF0ZSBjcmMyOiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQgPSBudWxsO1xuICAgICAgICBwcml2YXRlIGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQgPSBudWxsO1xuICAgICAgICBwcml2YXRlIHBpY2tCdWZmZXJzOiBQaWNrQnVmZmVyW10gPSBbXTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ29ubmVjdHMgdGhlIHZpZXdwb3J0IHRvIHRoZSBnaXZlbiBjYW52YXMgdG8gcmVuZGVyIHRoZSBnaXZlbiBicmFuY2ggdG8gdXNpbmcgdGhlIGdpdmVuIGNhbWVyYS1jb21wb25lbnQsIGFuZCBuYW1lcyB0aGUgdmlld3BvcnQgYXMgZ2l2ZW4uXG4gICAgICAgICAqIEBwYXJhbSBfbmFtZSBcbiAgICAgICAgICogQHBhcmFtIF9icmFuY2ggXG4gICAgICAgICAqIEBwYXJhbSBfY2FtZXJhIFxuICAgICAgICAgKiBAcGFyYW0gX2NhbnZhcyBcbiAgICAgICAgICovXG4gICAgICAgIHB1YmxpYyBpbml0aWFsaXplKF9uYW1lOiBzdHJpbmcsIF9icmFuY2g6IE5vZGUsIF9jYW1lcmE6IENvbXBvbmVudENhbWVyYSwgX2NhbnZhczogSFRNTENhbnZhc0VsZW1lbnQpOiB2b2lkIHtcbiAgICAgICAgICAgIHRoaXMubmFtZSA9IF9uYW1lO1xuICAgICAgICAgICAgdGhpcy5jYW1lcmEgPSBfY2FtZXJhO1xuICAgICAgICAgICAgdGhpcy5jYW52YXMgPSBfY2FudmFzO1xuICAgICAgICAgICAgdGhpcy5jcmMyID0gX2NhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XG5cbiAgICAgICAgICAgIHRoaXMucmVjdFNvdXJjZSA9IFJlbmRlck1hbmFnZXIuZ2V0Q2FudmFzUmVjdCgpO1xuICAgICAgICAgICAgdGhpcy5yZWN0RGVzdGluYXRpb24gPSB0aGlzLmdldENsaWVudFJlY3RhbmdsZSgpO1xuXG4gICAgICAgICAgICB0aGlzLnNldEJyYW5jaChfYnJhbmNoKTtcbiAgICAgICAgfVxuICAgICAgICAvKipcbiAgICAgICAgICogUmV0cmlldmUgdGhlIDJELWNvbnRleHQgYXR0YWNoZWQgdG8gdGhlIGRlc3RpbmF0aW9uIGNhbnZhc1xuICAgICAgICAgKi9cbiAgICAgICAgcHVibGljIGdldENvbnRleHQoKTogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNyYzI7XG4gICAgICAgIH1cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJldHJpZXZlIHRoZSBzaXplIG9mIHRoZSBkZXN0aW5hdGlvbiBjYW52YXMgYXMgYSByZWN0YW5nbGUsIHggYW5kIHkgYXJlIGFsd2F5cyAwIFxuICAgICAgICAgKi9cbiAgICAgICAgcHVibGljIGdldENhbnZhc1JlY3RhbmdsZSgpOiBSZWN0YW5nbGUge1xuICAgICAgICAgICAgcmV0dXJuIFJlY3RhbmdsZS5HRVQoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCk7XG4gICAgICAgIH1cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJldHJpZXZlIHRoZSBjbGllbnQgcmVjdGFuZ2xlIHRoZSBjYW52YXMgaXMgZGlzcGxheWVkIGFuZCBmaXQgaW4sIHggYW5kIHkgYXJlIGFsd2F5cyAwIFxuICAgICAgICAgKi9cbiAgICAgICAgcHVibGljIGdldENsaWVudFJlY3RhbmdsZSgpOiBSZWN0YW5nbGUge1xuICAgICAgICAgICAgcmV0dXJuIFJlY3RhbmdsZS5HRVQoMCwgMCwgdGhpcy5jYW52YXMuY2xpZW50V2lkdGgsIHRoaXMuY2FudmFzLmNsaWVudEhlaWdodCk7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogU2V0IHRoZSBicmFuY2ggdG8gYmUgZHJhd24gaW4gdGhlIHZpZXdwb3J0LlxuICAgICAgICAgKi9cbiAgICAgICAgcHVibGljIHNldEJyYW5jaChfYnJhbmNoOiBOb2RlKTogdm9pZCB7XG4gICAgICAgICAgICBpZiAodGhpcy5icmFuY2gpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmJyYW5jaC5yZW1vdmVFdmVudExpc3RlbmVyKEVWRU5ULkNPTVBPTkVOVF9BREQsIHRoaXMuaG5kQ29tcG9uZW50RXZlbnQpO1xuICAgICAgICAgICAgICAgIHRoaXMuYnJhbmNoLnJlbW92ZUV2ZW50TGlzdGVuZXIoRVZFTlQuQ09NUE9ORU5UX1JFTU9WRSwgdGhpcy5obmRDb21wb25lbnRFdmVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmJyYW5jaCA9IF9icmFuY2g7XG4gICAgICAgICAgICB0aGlzLmNvbGxlY3RMaWdodHMoKTtcbiAgICAgICAgICAgIHRoaXMuYnJhbmNoLmFkZEV2ZW50TGlzdGVuZXIoRVZFTlQuQ09NUE9ORU5UX0FERCwgdGhpcy5obmRDb21wb25lbnRFdmVudCk7XG4gICAgICAgICAgICB0aGlzLmJyYW5jaC5hZGRFdmVudExpc3RlbmVyKEVWRU5ULkNPTVBPTkVOVF9SRU1PVkUsIHRoaXMuaG5kQ29tcG9uZW50RXZlbnQpO1xuICAgICAgICB9XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBMb2dzIHRoaXMgdmlld3BvcnRzIHNjZW5lZ3JhcGggdG8gdGhlIGNvbnNvbGUuXG4gICAgICAgICAqL1xuICAgICAgICBwdWJsaWMgc2hvd1NjZW5lR3JhcGgoKTogdm9pZCB7XG4gICAgICAgICAgICAvLyBUT0RPOiBtb3ZlIHRvIGRlYnVnLWNsYXNzXG4gICAgICAgICAgICBsZXQgb3V0cHV0OiBzdHJpbmcgPSBcIlNjZW5lR3JhcGggZm9yIHRoaXMgdmlld3BvcnQ6XCI7XG4gICAgICAgICAgICBvdXRwdXQgKz0gXCJcXG4gXFxuXCI7XG4gICAgICAgICAgICBvdXRwdXQgKz0gdGhpcy5icmFuY2gubmFtZTtcbiAgICAgICAgICAgIERlYnVnLmxvZyhvdXRwdXQgKyBcIiAgID0+IFJPT1ROT0RFXCIgKyB0aGlzLmNyZWF0ZVNjZW5lR3JhcGgodGhpcy5icmFuY2gpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vICNyZWdpb24gRHJhd2luZ1xuICAgICAgICAvKipcbiAgICAgICAgICogRHJhdyB0aGlzIHZpZXdwb3J0XG4gICAgICAgICAqL1xuICAgICAgICBwdWJsaWMgZHJhdygpOiB2b2lkIHtcbiAgICAgICAgICAgIFJlbmRlck1hbmFnZXIucmVzZXRGcmFtZUJ1ZmZlcigpO1xuICAgICAgICAgICAgaWYgKCF0aGlzLmNhbWVyYS5pc0FjdGl2ZSlcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICBpZiAodGhpcy5hZGp1c3RpbmdGcmFtZXMpXG4gICAgICAgICAgICAgICAgdGhpcy5hZGp1c3RGcmFtZXMoKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmFkanVzdGluZ0NhbWVyYSlcbiAgICAgICAgICAgICAgICB0aGlzLmFkanVzdENhbWVyYSgpO1xuXG4gICAgICAgICAgICBSZW5kZXJNYW5hZ2VyLmNsZWFyKHRoaXMuY2FtZXJhLmdldEJhY2tnb3VuZENvbG9yKCkpO1xuICAgICAgICAgICAgaWYgKFJlbmRlck1hbmFnZXIuYWRkQnJhbmNoKHRoaXMuYnJhbmNoKSlcbiAgICAgICAgICAgICAgICAvLyBicmFuY2ggaGFzIG5vdCB5ZXQgYmVlbiBwcm9jZXNzZWQgZnVsbHkgYnkgcmVuZGVybWFuYWdlciAtPiB1cGRhdGUgYWxsIHJlZ2lzdGVyZWQgbm9kZXNcbiAgICAgICAgICAgICAgICBSZW5kZXJNYW5hZ2VyLnVwZGF0ZSgpO1xuICAgICAgICAgICAgUmVuZGVyTWFuYWdlci5zZXRMaWdodHModGhpcy5saWdodHMpO1xuICAgICAgICAgICAgUmVuZGVyTWFuYWdlci5kcmF3QnJhbmNoKHRoaXMuYnJhbmNoLCB0aGlzLmNhbWVyYSk7XG5cbiAgICAgICAgICAgIHRoaXMuY3JjMi5pbWFnZVNtb290aGluZ0VuYWJsZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuY3JjMi5kcmF3SW1hZ2UoXG4gICAgICAgICAgICAgICAgUmVuZGVyTWFuYWdlci5nZXRDYW52YXMoKSxcbiAgICAgICAgICAgICAgICB0aGlzLnJlY3RTb3VyY2UueCwgdGhpcy5yZWN0U291cmNlLnksIHRoaXMucmVjdFNvdXJjZS53aWR0aCwgdGhpcy5yZWN0U291cmNlLmhlaWdodCxcbiAgICAgICAgICAgICAgICB0aGlzLnJlY3REZXN0aW5hdGlvbi54LCB0aGlzLnJlY3REZXN0aW5hdGlvbi55LCB0aGlzLnJlY3REZXN0aW5hdGlvbi53aWR0aCwgdGhpcy5yZWN0RGVzdGluYXRpb24uaGVpZ2h0XG4gICAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICogRHJhdyB0aGlzIHZpZXdwb3J0IGZvciBSYXlDYXN0XG4gICAgICAgICovXG4gICAgICAgIHB1YmxpYyBjcmVhdGVQaWNrQnVmZmVycygpOiB2b2lkIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmFkanVzdGluZ0ZyYW1lcylcbiAgICAgICAgICAgICAgICB0aGlzLmFkanVzdEZyYW1lcygpO1xuICAgICAgICAgICAgaWYgKHRoaXMuYWRqdXN0aW5nQ2FtZXJhKVxuICAgICAgICAgICAgICAgIHRoaXMuYWRqdXN0Q2FtZXJhKCk7XG5cbiAgICAgICAgICAgIGlmIChSZW5kZXJNYW5hZ2VyLmFkZEJyYW5jaCh0aGlzLmJyYW5jaCkpXG4gICAgICAgICAgICAgICAgLy8gYnJhbmNoIGhhcyBub3QgeWV0IGJlZW4gcHJvY2Vzc2VkIGZ1bGx5IGJ5IHJlbmRlcm1hbmFnZXIgLT4gdXBkYXRlIGFsbCByZWdpc3RlcmVkIG5vZGVzXG4gICAgICAgICAgICAgICAgUmVuZGVyTWFuYWdlci51cGRhdGUoKTtcblxuICAgICAgICAgICAgdGhpcy5waWNrQnVmZmVycyA9IFJlbmRlck1hbmFnZXIuZHJhd0JyYW5jaEZvclJheUNhc3QodGhpcy5icmFuY2gsIHRoaXMuY2FtZXJhKTtcblxuICAgICAgICAgICAgdGhpcy5jcmMyLmltYWdlU21vb3RoaW5nRW5hYmxlZCA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5jcmMyLmRyYXdJbWFnZShcbiAgICAgICAgICAgICAgICBSZW5kZXJNYW5hZ2VyLmdldENhbnZhcygpLFxuICAgICAgICAgICAgICAgIHRoaXMucmVjdFNvdXJjZS54LCB0aGlzLnJlY3RTb3VyY2UueSwgdGhpcy5yZWN0U291cmNlLndpZHRoLCB0aGlzLnJlY3RTb3VyY2UuaGVpZ2h0LFxuICAgICAgICAgICAgICAgIHRoaXMucmVjdERlc3RpbmF0aW9uLngsIHRoaXMucmVjdERlc3RpbmF0aW9uLnksIHRoaXMucmVjdERlc3RpbmF0aW9uLndpZHRoLCB0aGlzLnJlY3REZXN0aW5hdGlvbi5oZWlnaHRcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuXG4gICAgICAgIHB1YmxpYyBwaWNrTm9kZUF0KF9wb3M6IFZlY3RvcjIpOiBSYXlIaXRbXSB7XG4gICAgICAgICAgICAvLyB0aGlzLmNyZWF0ZVBpY2tCdWZmZXJzKCk7XG4gICAgICAgICAgICBsZXQgaGl0czogUmF5SGl0W10gPSBSZW5kZXJNYW5hZ2VyLnBpY2tOb2RlQXQoX3BvcywgdGhpcy5waWNrQnVmZmVycywgdGhpcy5yZWN0U291cmNlKTtcbiAgICAgICAgICAgIGhpdHMuc29ydCgoYTogUmF5SGl0LCBiOiBSYXlIaXQpID0+IChiLnpCdWZmZXIgPiAwKSA/IChhLnpCdWZmZXIgPiAwKSA/IGEuekJ1ZmZlciAtIGIuekJ1ZmZlciA6IDEgOiAtMSk7XG4gICAgICAgICAgICByZXR1cm4gaGl0cztcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBZGp1c3QgYWxsIGZyYW1lcyBpbnZvbHZlZCBpbiB0aGUgcmVuZGVyaW5nIHByb2Nlc3MgZnJvbSB0aGUgZGlzcGxheSBhcmVhIGluIHRoZSBjbGllbnQgdXAgdG8gdGhlIHJlbmRlcmVyIGNhbnZhc1xuICAgICAgICAgKi9cbiAgICAgICAgcHVibGljIGFkanVzdEZyYW1lcygpOiB2b2lkIHtcbiAgICAgICAgICAgIC8vIGdldCB0aGUgcmVjdGFuZ2xlIG9mIHRoZSBjYW52YXMgYXJlYSBhcyBkaXNwbGF5ZWQgKGNvbnNpZGVyIGNzcylcbiAgICAgICAgICAgIGxldCByZWN0Q2xpZW50OiBSZWN0YW5nbGUgPSB0aGlzLmdldENsaWVudFJlY3RhbmdsZSgpO1xuICAgICAgICAgICAgLy8gYWRqdXN0IHRoZSBjYW52YXMgc2l6ZSBhY2NvcmRpbmcgdG8gdGhlIGdpdmVuIGZyYW1pbmcgYXBwbGllZCB0byBjbGllbnRcbiAgICAgICAgICAgIGxldCByZWN0Q2FudmFzOiBSZWN0YW5nbGUgPSB0aGlzLmZyYW1lQ2xpZW50VG9DYW52YXMuZ2V0UmVjdChyZWN0Q2xpZW50KTtcbiAgICAgICAgICAgIHRoaXMuY2FudmFzLndpZHRoID0gcmVjdENhbnZhcy53aWR0aDtcbiAgICAgICAgICAgIHRoaXMuY2FudmFzLmhlaWdodCA9IHJlY3RDYW52YXMuaGVpZ2h0O1xuICAgICAgICAgICAgLy8gYWRqdXN0IHRoZSBkZXN0aW5hdGlvbiBhcmVhIG9uIHRoZSB0YXJnZXQtY2FudmFzIHRvIHJlbmRlciB0byBieSBhcHBseWluZyB0aGUgZnJhbWluZyB0byBjYW52YXNcbiAgICAgICAgICAgIHRoaXMucmVjdERlc3RpbmF0aW9uID0gdGhpcy5mcmFtZUNhbnZhc1RvRGVzdGluYXRpb24uZ2V0UmVjdChyZWN0Q2FudmFzKTtcbiAgICAgICAgICAgIC8vIGFkanVzdCB0aGUgYXJlYSBvbiB0aGUgc291cmNlLWNhbnZhcyB0byByZW5kZXIgZnJvbSBieSBhcHBseWluZyB0aGUgZnJhbWluZyB0byBkZXN0aW5hdGlvbiBhcmVhXG4gICAgICAgICAgICB0aGlzLnJlY3RTb3VyY2UgPSB0aGlzLmZyYW1lRGVzdGluYXRpb25Ub1NvdXJjZS5nZXRSZWN0KHRoaXMucmVjdERlc3RpbmF0aW9uKTtcbiAgICAgICAgICAgIC8vIGhhdmluZyBhbiBvZmZzZXQgc291cmNlIGRvZXMgbWFrZSBzZW5zZSBvbmx5IHdoZW4gbXVsdGlwbGUgdmlld3BvcnRzIGRpc3BsYXkgcGFydHMgb2YgdGhlIHNhbWUgcmVuZGVyaW5nLiBGb3Igbm93OiBzaGlmdCBpdCB0byAwLDBcbiAgICAgICAgICAgIHRoaXMucmVjdFNvdXJjZS54ID0gdGhpcy5yZWN0U291cmNlLnkgPSAwO1xuICAgICAgICAgICAgLy8gc3RpbGwsIGEgcGFydGlhbCBpbWFnZSBvZiB0aGUgcmVuZGVyaW5nIG1heSBiZSByZXRyaWV2ZWQgYnkgbW92aW5nIGFuZCByZXNpemluZyB0aGUgcmVuZGVyIHZpZXdwb3J0XG4gICAgICAgICAgICBsZXQgcmVjdFJlbmRlcjogUmVjdGFuZ2xlID0gdGhpcy5mcmFtZVNvdXJjZVRvUmVuZGVyLmdldFJlY3QodGhpcy5yZWN0U291cmNlKTtcbiAgICAgICAgICAgIFJlbmRlck1hbmFnZXIuc2V0Vmlld3BvcnRSZWN0YW5nbGUocmVjdFJlbmRlcik7XG4gICAgICAgICAgICAvLyBubyBtb3JlIHRyYW5zZm9ybWF0aW9uIGFmdGVyIHRoaXMgZm9yIG5vdywgb2Zmc2NyZWVuIGNhbnZhcyBhbmQgcmVuZGVyLXZpZXdwb3J0IGhhdmUgdGhlIHNhbWUgc2l6ZVxuICAgICAgICAgICAgUmVuZGVyTWFuYWdlci5zZXRDYW52YXNTaXplKHJlY3RSZW5kZXIud2lkdGgsIHJlY3RSZW5kZXIuaGVpZ2h0KTtcbiAgICAgICAgfVxuICAgICAgICAvKipcbiAgICAgICAgICogQWRqdXN0IHRoZSBjYW1lcmEgcGFyYW1ldGVycyB0byBmaXQgdGhlIHJlbmRlcmluZyBpbnRvIHRoZSByZW5kZXIgdmllcG9ydFxuICAgICAgICAgKi9cbiAgICAgICAgcHVibGljIGFkanVzdENhbWVyYSgpOiB2b2lkIHtcbiAgICAgICAgICAgIGxldCByZWN0OiBSZWN0YW5nbGUgPSBSZW5kZXJNYW5hZ2VyLmdldFZpZXdwb3J0UmVjdGFuZ2xlKCk7XG4gICAgICAgICAgICB0aGlzLmNhbWVyYS5wcm9qZWN0Q2VudHJhbChyZWN0LndpZHRoIC8gcmVjdC5oZWlnaHQsIHRoaXMuY2FtZXJhLmdldEZpZWxkT2ZWaWV3KCkpO1xuICAgICAgICB9XG4gICAgICAgIC8vICNlbmRyZWdpb25cblxuICAgICAgICAvLyNyZWdpb24gUG9pbnRzXG4gICAgICAgIHB1YmxpYyBwb2ludENsaWVudFRvU291cmNlKF9jbGllbnQ6IFZlY3RvcjIpOiBWZWN0b3IyIHtcbiAgICAgICAgICAgIGxldCByZXN1bHQ6IFZlY3RvcjI7XG4gICAgICAgICAgICBsZXQgcmVjdDogUmVjdGFuZ2xlO1xuICAgICAgICAgICAgcmVjdCA9IHRoaXMuZ2V0Q2xpZW50UmVjdGFuZ2xlKCk7XG4gICAgICAgICAgICByZXN1bHQgPSB0aGlzLmZyYW1lQ2xpZW50VG9DYW52YXMuZ2V0UG9pbnQoX2NsaWVudCwgcmVjdCk7XG4gICAgICAgICAgICByZWN0ID0gdGhpcy5nZXRDYW52YXNSZWN0YW5nbGUoKTtcbiAgICAgICAgICAgIHJlc3VsdCA9IHRoaXMuZnJhbWVDYW52YXNUb0Rlc3RpbmF0aW9uLmdldFBvaW50KHJlc3VsdCwgcmVjdCk7XG4gICAgICAgICAgICByZXN1bHQgPSB0aGlzLmZyYW1lRGVzdGluYXRpb25Ub1NvdXJjZS5nZXRQb2ludChyZXN1bHQsIHRoaXMucmVjdFNvdXJjZSk7XG4gICAgICAgICAgICAvL1RPRE86IHdoZW4gU291cmNlLCBSZW5kZXIgYW5kIFJlbmRlclZpZXdwb3J0IGRldmlhdGUsIGNvbnRpbnVlIHRyYW5zZm9ybWF0aW9uIFxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuXG4gICAgICAgIHB1YmxpYyBwb2ludFNvdXJjZVRvUmVuZGVyKF9zb3VyY2U6IFZlY3RvcjIpOiBWZWN0b3IyIHtcbiAgICAgICAgICAgIGxldCBwcm9qZWN0aW9uUmVjdGFuZ2xlOiBSZWN0YW5nbGUgPSB0aGlzLmNhbWVyYS5nZXRQcm9qZWN0aW9uUmVjdGFuZ2xlKCk7XG4gICAgICAgICAgICBsZXQgcG9pbnQ6IFZlY3RvcjIgPSB0aGlzLmZyYW1lU291cmNlVG9SZW5kZXIuZ2V0UG9pbnQoX3NvdXJjZSwgcHJvamVjdGlvblJlY3RhbmdsZSk7XG4gICAgICAgICAgICByZXR1cm4gcG9pbnQ7XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgcG9pbnRDbGllbnRUb1JlbmRlcihfY2xpZW50OiBWZWN0b3IyKTogVmVjdG9yMiB7XG4gICAgICAgICAgICBsZXQgcG9pbnQ6IFZlY3RvcjIgPSB0aGlzLnBvaW50Q2xpZW50VG9Tb3VyY2UoX2NsaWVudCk7XG4gICAgICAgICAgICBwb2ludCA9IHRoaXMucG9pbnRTb3VyY2VUb1JlbmRlcihwb2ludCk7XG4gICAgICAgICAgICAvL1RPRE86IHdoZW4gUmVuZGVyIGFuZCBSZW5kZXJWaWV3cG9ydCBkZXZpYXRlLCBjb250aW51ZSB0cmFuc2Zvcm1hdGlvbiBcbiAgICAgICAgICAgIHJldHVybiBwb2ludDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vI2VuZHJlZ2lvblxuXG4gICAgICAgIC8vICNyZWdpb24gRXZlbnRzIChwYXNzaW5nIGZyb20gY2FudmFzIHRvIHZpZXdwb3J0IGFuZCBmcm9tIHRoZXJlIGludG8gYnJhbmNoKVxuICAgICAgICAvKipcbiAgICAgICAgICogUmV0dXJucyB0cnVlIGlmIHRoaXMgdmlld3BvcnQgY3VycmVudGx5IGhhcyBmb2N1cyBhbmQgdGh1cyByZWNlaXZlcyBrZXlib2FyZCBldmVudHNcbiAgICAgICAgICovXG4gICAgICAgIHB1YmxpYyBnZXQgaGFzRm9jdXMoKTogYm9vbGVhbiB7XG4gICAgICAgICAgICByZXR1cm4gKFZpZXdwb3J0LmZvY3VzID09IHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTd2l0Y2ggdGhlIHZpZXdwb3J0cyBmb2N1cyBvbiBvciBvZmYuIE9ubHkgb25lIHZpZXdwb3J0IGluIG9uZSBGVURHRSBpbnN0YW5jZSBjYW4gaGF2ZSB0aGUgZm9jdXMsIHRodXMgcmVjZWl2aW5nIGtleWJvYXJkIGV2ZW50cy4gXG4gICAgICAgICAqIFNvIGEgdmlld3BvcnQgY3VycmVudGx5IGhhdmluZyB0aGUgZm9jdXMgd2lsbCBsb3NlIGl0LCB3aGVuIGFub3RoZXIgb25lIHJlY2VpdmVzIGl0LiBUaGUgdmlld3BvcnRzIGZpcmUgW1tFdmVudF1dcyBhY2NvcmRpbmdseS5cbiAgICAgICAgICogIFxuICAgICAgICAgKiBAcGFyYW0gX29uIFxuICAgICAgICAgKi9cbiAgICAgICAgcHVibGljIHNldEZvY3VzKF9vbjogYm9vbGVhbik6IHZvaWQge1xuICAgICAgICAgICAgaWYgKF9vbikge1xuICAgICAgICAgICAgICAgIGlmIChWaWV3cG9ydC5mb2N1cyA9PSB0aGlzKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgaWYgKFZpZXdwb3J0LmZvY3VzKVxuICAgICAgICAgICAgICAgICAgICBWaWV3cG9ydC5mb2N1cy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudChFVkVOVC5GT0NVU19PVVQpKTtcbiAgICAgICAgICAgICAgICBWaWV3cG9ydC5mb2N1cyA9IHRoaXM7XG4gICAgICAgICAgICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudChFVkVOVC5GT0NVU19JTikpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKFZpZXdwb3J0LmZvY3VzICE9IHRoaXMpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoRVZFTlQuRk9DVVNfT1VUKSk7XG4gICAgICAgICAgICAgICAgVmlld3BvcnQuZm9jdXMgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZS0gLyBBY3RpdmF0ZXMgdGhlIGdpdmVuIHBvaW50ZXIgZXZlbnQgdG8gYmUgcHJvcGFnYXRlZCBpbnRvIHRoZSB2aWV3cG9ydCBhcyBGVURHRS1FdmVudCBcbiAgICAgICAgICogQHBhcmFtIF90eXBlIFxuICAgICAgICAgKiBAcGFyYW0gX29uIFxuICAgICAgICAgKi9cbiAgICAgICAgcHVibGljIGFjdGl2YXRlUG9pbnRlckV2ZW50KF90eXBlOiBFVkVOVF9QT0lOVEVSLCBfb246IGJvb2xlYW4pOiB2b2lkIHtcbiAgICAgICAgICAgIHRoaXMuYWN0aXZhdGVFdmVudCh0aGlzLmNhbnZhcywgX3R5cGUsIHRoaXMuaG5kUG9pbnRlckV2ZW50LCBfb24pO1xuICAgICAgICB9XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZS0gLyBBY3RpdmF0ZXMgdGhlIGdpdmVuIGtleWJvYXJkIGV2ZW50IHRvIGJlIHByb3BhZ2F0ZWQgaW50byB0aGUgdmlld3BvcnQgYXMgRlVER0UtRXZlbnRcbiAgICAgICAgICogQHBhcmFtIF90eXBlIFxuICAgICAgICAgKiBAcGFyYW0gX29uIFxuICAgICAgICAgKi9cbiAgICAgICAgcHVibGljIGFjdGl2YXRlS2V5Ym9hcmRFdmVudChfdHlwZTogRVZFTlRfS0VZQk9BUkQsIF9vbjogYm9vbGVhbik6IHZvaWQge1xuICAgICAgICAgICAgdGhpcy5hY3RpdmF0ZUV2ZW50KHRoaXMuY2FudmFzLm93bmVyRG9jdW1lbnQsIF90eXBlLCB0aGlzLmhuZEtleWJvYXJkRXZlbnQsIF9vbik7XG4gICAgICAgIH1cbiAgICAgICAgLyoqXG4gICAgICAgICAqIERlLSAvIEFjdGl2YXRlcyB0aGUgZ2l2ZW4gZHJhZy1kcm9wIGV2ZW50IHRvIGJlIHByb3BhZ2F0ZWQgaW50byB0aGUgdmlld3BvcnQgYXMgRlVER0UtRXZlbnRcbiAgICAgICAgICogQHBhcmFtIF90eXBlIFxuICAgICAgICAgKiBAcGFyYW0gX29uIFxuICAgICAgICAgKi9cbiAgICAgICAgcHVibGljIGFjdGl2YXRlRHJhZ0Ryb3BFdmVudChfdHlwZTogRVZFTlRfRFJBR0RST1AsIF9vbjogYm9vbGVhbik6IHZvaWQge1xuICAgICAgICAgICAgaWYgKF90eXBlID09IEVWRU5UX0RSQUdEUk9QLlNUQVJUKVxuICAgICAgICAgICAgICAgIHRoaXMuY2FudmFzLmRyYWdnYWJsZSA9IF9vbjtcbiAgICAgICAgICAgIHRoaXMuYWN0aXZhdGVFdmVudCh0aGlzLmNhbnZhcywgX3R5cGUsIHRoaXMuaG5kRHJhZ0Ryb3BFdmVudCwgX29uKTtcbiAgICAgICAgfVxuICAgICAgICAvKipcbiAgICAgICAgICogRGUtIC8gQWN0aXZhdGVzIHRoZSB3aGVlbCBldmVudCB0byBiZSBwcm9wYWdhdGVkIGludG8gdGhlIHZpZXdwb3J0IGFzIEZVREdFLUV2ZW50XG4gICAgICAgICAqIEBwYXJhbSBfdHlwZSBcbiAgICAgICAgICogQHBhcmFtIF9vbiBcbiAgICAgICAgICovXG4gICAgICAgIHB1YmxpYyBhY3RpdmF0ZVdoZWVsRXZlbnQoX3R5cGU6IEVWRU5UX1dIRUVMLCBfb246IGJvb2xlYW4pOiB2b2lkIHtcbiAgICAgICAgICAgIHRoaXMuYWN0aXZhdGVFdmVudCh0aGlzLmNhbnZhcywgX3R5cGUsIHRoaXMuaG5kV2hlZWxFdmVudCwgX29uKTtcbiAgICAgICAgfVxuICAgICAgICAvKipcbiAgICAgICAgICogSGFuZGxlIGRyYWctZHJvcCBldmVudHMgYW5kIGRpc3BhdGNoIHRvIHZpZXdwb3J0IGFzIEZVREdFLUV2ZW50XG4gICAgICAgICAqL1xuICAgICAgICBwcml2YXRlIGhuZERyYWdEcm9wRXZlbnQ6IEV2ZW50TGlzdGVuZXIgPSAoX2V2ZW50OiBFdmVudCkgPT4ge1xuICAgICAgICAgICAgbGV0IF9kcmFnZXZlbnQ6IERyYWdEcm9wRXZlbnTGkiA9IDxEcmFnRHJvcEV2ZW50xpI+X2V2ZW50O1xuICAgICAgICAgICAgc3dpdGNoIChfZHJhZ2V2ZW50LnR5cGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlIFwiZHJhZ292ZXJcIjpcbiAgICAgICAgICAgICAgICBjYXNlIFwiZHJvcFwiOlxuICAgICAgICAgICAgICAgICAgICBfZHJhZ2V2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgIF9kcmFnZXZlbnQuZGF0YVRyYW5zZmVyLmVmZmVjdEFsbG93ZWQgPSBcIm5vbmVcIjtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcImRyYWdzdGFydFwiOlxuICAgICAgICAgICAgICAgICAgICAvLyBqdXN0IGR1bW15IGRhdGEsICB2YWxpZCBkYXRhIHNob3VsZCBiZSBzZXQgaW4gaGFuZGxlciByZWdpc3RlcmVkIGJ5IHRoZSB1c2VyXG4gICAgICAgICAgICAgICAgICAgIF9kcmFnZXZlbnQuZGF0YVRyYW5zZmVyLnNldERhdGEoXCJ0ZXh0XCIsIFwiSGFsbG9cIik7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRPRE86IGNoZWNrIGlmIHRoZXJlIGlzIGEgYmV0dGVyIHNvbHV0aW9uIHRvIGhpZGUgdGhlIGdob3N0IGltYWdlIG9mIHRoZSBkcmFnZ2FibGUgb2JqZWN0XG4gICAgICAgICAgICAgICAgICAgIF9kcmFnZXZlbnQuZGF0YVRyYW5zZmVyLnNldERyYWdJbWFnZShuZXcgSW1hZ2UoKSwgMCwgMCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGV0IGV2ZW50OiBEcmFnRHJvcEV2ZW50xpIgPSBuZXcgRHJhZ0Ryb3BFdmVudMaSKFwixpJcIiArIF9ldmVudC50eXBlLCBfZHJhZ2V2ZW50KTtcbiAgICAgICAgICAgIHRoaXMuYWRkQ2FudmFzUG9zaXRpb24oZXZlbnQpO1xuICAgICAgICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgfVxuICAgICAgICAvKipcbiAgICAgICAgICogQWRkIHBvc2l0aW9uIG9mIHRoZSBwb2ludGVyIG1hcHBlZCB0byBjYW52YXMtY29vcmRpbmF0ZXMgYXMgY2FudmFzWCwgY2FudmFzWSB0byB0aGUgZXZlbnRcbiAgICAgICAgICogQHBhcmFtIGV2ZW50XG4gICAgICAgICAqL1xuICAgICAgICBwcml2YXRlIGFkZENhbnZhc1Bvc2l0aW9uKGV2ZW50OiBQb2ludGVyRXZlbnTGkiB8IERyYWdEcm9wRXZlbnTGkik6IHZvaWQge1xuICAgICAgICAgICAgZXZlbnQuY2FudmFzWCA9IHRoaXMuY2FudmFzLndpZHRoICogZXZlbnQucG9pbnRlclggLyBldmVudC5jbGllbnRSZWN0LndpZHRoO1xuICAgICAgICAgICAgZXZlbnQuY2FudmFzWSA9IHRoaXMuY2FudmFzLmhlaWdodCAqIGV2ZW50LnBvaW50ZXJZIC8gZXZlbnQuY2xpZW50UmVjdC5oZWlnaHQ7XG4gICAgICAgIH1cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEhhbmRsZSBwb2ludGVyIGV2ZW50cyBhbmQgZGlzcGF0Y2ggdG8gdmlld3BvcnQgYXMgRlVER0UtRXZlbnRcbiAgICAgICAgICovXG4gICAgICAgIHByaXZhdGUgaG5kUG9pbnRlckV2ZW50OiBFdmVudExpc3RlbmVyID0gKF9ldmVudDogRXZlbnQpID0+IHtcbiAgICAgICAgICAgIGxldCBldmVudDogUG9pbnRlckV2ZW50xpIgPSBuZXcgUG9pbnRlckV2ZW50xpIoXCLGklwiICsgX2V2ZW50LnR5cGUsIDxQb2ludGVyRXZlbnTGkj5fZXZlbnQpO1xuICAgICAgICAgICAgdGhpcy5hZGRDYW52YXNQb3NpdGlvbihldmVudCk7XG4gICAgICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgICAgICB9XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBIYW5kbGUga2V5Ym9hcmQgZXZlbnRzIGFuZCBkaXNwYXRjaCB0byB2aWV3cG9ydCBhcyBGVURHRS1FdmVudCwgaWYgdGhlIHZpZXdwb3J0IGhhcyB0aGUgZm9jdXNcbiAgICAgICAgICovXG4gICAgICAgIHByaXZhdGUgaG5kS2V5Ym9hcmRFdmVudDogRXZlbnRMaXN0ZW5lciA9IChfZXZlbnQ6IEV2ZW50KSA9PiB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuaGFzRm9jdXMpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgbGV0IGV2ZW50OiBLZXlib2FyZEV2ZW50xpIgPSBuZXcgS2V5Ym9hcmRFdmVudMaSKFwixpJcIiArIF9ldmVudC50eXBlLCA8S2V5Ym9hcmRFdmVudMaSPl9ldmVudCk7XG4gICAgICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgICAgICB9XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBIYW5kbGUgd2hlZWwgZXZlbnQgYW5kIGRpc3BhdGNoIHRvIHZpZXdwb3J0IGFzIEZVREdFLUV2ZW50XG4gICAgICAgICAqL1xuICAgICAgICBwcml2YXRlIGhuZFdoZWVsRXZlbnQ6IEV2ZW50TGlzdGVuZXIgPSAoX2V2ZW50OiBFdmVudCkgPT4ge1xuICAgICAgICAgICAgbGV0IGV2ZW50OiBXaGVlbEV2ZW50xpIgPSBuZXcgV2hlZWxFdmVudMaSKFwixpJcIiArIF9ldmVudC50eXBlLCA8V2hlZWxFdmVudMaSPl9ldmVudCk7XG4gICAgICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgICAgICB9XG5cbiAgICAgICAgcHJpdmF0ZSBhY3RpdmF0ZUV2ZW50KF90YXJnZXQ6IEV2ZW50VGFyZ2V0LCBfdHlwZTogc3RyaW5nLCBfaGFuZGxlcjogRXZlbnRMaXN0ZW5lciwgX29uOiBib29sZWFuKTogdm9pZCB7XG4gICAgICAgICAgICBfdHlwZSA9IF90eXBlLnNsaWNlKDEpOyAvLyBjaGlwIHRoZSDGkmxvcmVudGluXG4gICAgICAgICAgICBpZiAoX29uKVxuICAgICAgICAgICAgICAgIF90YXJnZXQuYWRkRXZlbnRMaXN0ZW5lcihfdHlwZSwgX2hhbmRsZXIpO1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIF90YXJnZXQucmVtb3ZlRXZlbnRMaXN0ZW5lcihfdHlwZSwgX2hhbmRsZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgcHJpdmF0ZSBobmRDb21wb25lbnRFdmVudChfZXZlbnQ6IEV2ZW50KTogdm9pZCB7XG4gICAgICAgICAgICBEZWJ1Zy5sb2coX2V2ZW50KTtcbiAgICAgICAgfVxuICAgICAgICAvLyAjZW5kcmVnaW9uXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENvbGxlY3QgYWxsIGxpZ2h0cyBpbiB0aGUgYnJhbmNoIHRvIHBhc3MgdG8gc2hhZGVyc1xuICAgICAgICAgKi9cbiAgICAgICAgcHJpdmF0ZSBjb2xsZWN0TGlnaHRzKCk6IHZvaWQge1xuICAgICAgICAgICAgLy8gVE9ETzogbWFrZSBwcml2YXRlXG4gICAgICAgICAgICB0aGlzLmxpZ2h0cyA9IG5ldyBNYXAoKTtcbiAgICAgICAgICAgIGZvciAobGV0IG5vZGUgb2YgdGhpcy5icmFuY2guYnJhbmNoKSB7XG4gICAgICAgICAgICAgICAgbGV0IGNtcExpZ2h0czogQ29tcG9uZW50TGlnaHRbXSA9IG5vZGUuZ2V0Q29tcG9uZW50cyhDb21wb25lbnRMaWdodCk7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgY21wTGlnaHQgb2YgY21wTGlnaHRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCB0eXBlOiBzdHJpbmcgPSBjbXBMaWdodC5saWdodC50eXBlO1xuICAgICAgICAgICAgICAgICAgICBsZXQgbGlnaHRzT2ZUeXBlOiBDb21wb25lbnRMaWdodFtdID0gdGhpcy5saWdodHMuZ2V0KHR5cGUpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWxpZ2h0c09mVHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGlnaHRzT2ZUeXBlID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxpZ2h0cy5zZXQodHlwZSwgbGlnaHRzT2ZUeXBlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBsaWdodHNPZlR5cGUucHVzaChjbXBMaWdodCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDcmVhdGVzIGFuIG91dHB1dHN0cmluZyBhcyB2aXN1YWwgcmVwcmVzZW50YXRpb24gb2YgdGhpcyB2aWV3cG9ydHMgc2NlbmVncmFwaC4gQ2FsbGVkIGZvciB0aGUgcGFzc2VkIG5vZGUgYW5kIHJlY3Vyc2l2ZSBmb3IgYWxsIGl0cyBjaGlsZHJlbi5cbiAgICAgICAgICogQHBhcmFtIF9mdWRnZU5vZGUgVGhlIG5vZGUgdG8gY3JlYXRlIGEgc2NlbmVncmFwaGVudHJ5IGZvci5cbiAgICAgICAgICovXG4gICAgICAgIHByaXZhdGUgY3JlYXRlU2NlbmVHcmFwaChfZnVkZ2VOb2RlOiBOb2RlKTogc3RyaW5nIHtcbiAgICAgICAgICAgIC8vIFRPRE86IG1vdmUgdG8gZGVidWctY2xhc3NcbiAgICAgICAgICAgIGxldCBvdXRwdXQ6IHN0cmluZyA9IFwiXCI7XG4gICAgICAgICAgICBmb3IgKGxldCBuYW1lIGluIF9mdWRnZU5vZGUuZ2V0Q2hpbGRyZW4oKSkge1xuICAgICAgICAgICAgICAgIGxldCBjaGlsZDogTm9kZSA9IF9mdWRnZU5vZGUuZ2V0Q2hpbGRyZW4oKVtuYW1lXTtcbiAgICAgICAgICAgICAgICBvdXRwdXQgKz0gXCJcXG5cIjtcbiAgICAgICAgICAgICAgICBsZXQgY3VycmVudDogTm9kZSA9IGNoaWxkO1xuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50LmdldFBhcmVudCgpICYmIGN1cnJlbnQuZ2V0UGFyZW50KCkuZ2V0UGFyZW50KCkpXG4gICAgICAgICAgICAgICAgICAgIG91dHB1dCArPSBcInxcIjtcbiAgICAgICAgICAgICAgICB3aGlsZSAoY3VycmVudC5nZXRQYXJlbnQoKSAmJiBjdXJyZW50LmdldFBhcmVudCgpLmdldFBhcmVudCgpKSB7XG4gICAgICAgICAgICAgICAgICAgIG91dHB1dCArPSBcIiAgIFwiO1xuICAgICAgICAgICAgICAgICAgICBjdXJyZW50ID0gY3VycmVudC5nZXRQYXJlbnQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgb3V0cHV0ICs9IFwiJy0tXCI7XG5cbiAgICAgICAgICAgICAgICBvdXRwdXQgKz0gY2hpbGQubmFtZTtcbiAgICAgICAgICAgICAgICBvdXRwdXQgKz0gdGhpcy5jcmVhdGVTY2VuZUdyYXBoKGNoaWxkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBvdXRwdXQ7XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCJuYW1lc3BhY2UgRnVkZ2VDb3JlIHtcbiAgICBleHBvcnQgaW50ZXJmYWNlIE1hcEV2ZW50VHlwZVRvTGlzdGVuZXIge1xuICAgICAgICBbZXZlbnRUeXBlOiBzdHJpbmddOiBFdmVudExpc3RlbmVyW107XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVHlwZXMgb2YgZXZlbnRzIHNwZWNpZmljIHRvIEZ1ZGdlLCBpbiBhZGRpdGlvbiB0byB0aGUgc3RhbmRhcmQgRE9NL0Jyb3dzZXItVHlwZXMgYW5kIGN1c3RvbSBzdHJpbmdzXG4gICAgICovXG4gICAgZXhwb3J0IGNvbnN0IGVudW0gRVZFTlQge1xuICAgICAgICAvKiogZGlzcGF0Y2hlZCB0byB0YXJnZXRzIHJlZ2lzdGVyZWQgYXQgW1tMb29wXV0sIHdoZW4gcmVxdWVzdGVkIGFuaW1hdGlvbiBmcmFtZSBzdGFydHMgKi9cbiAgICAgICAgTE9PUF9GUkFNRSA9IFwibG9vcEZyYW1lXCIsXG4gICAgICAgIC8qKiBkaXNwYXRjaGVkIHRvIGEgW1tDb21wb25lbnRdXSB3aGVuIGl0cyBiZWluZyBhZGRlZCB0byBhIFtbTm9kZV1dICovXG4gICAgICAgIENPTVBPTkVOVF9BREQgPSBcImNvbXBvbmVudEFkZFwiLFxuICAgICAgICAvKiogZGlzcGF0Y2hlZCB0byBhIFtbQ29tcG9uZW50XV0gd2hlbiBpdHMgYmVpbmcgcmVtb3ZlZCBmcm9tIGEgW1tOb2RlXV0gKi9cbiAgICAgICAgQ09NUE9ORU5UX1JFTU9WRSA9IFwiY29tcG9uZW50UmVtb3ZlXCIsXG4gICAgICAgIC8qKiBkaXNwYXRjaGVkIHRvIGEgW1tDb21wb25lbnRdXSB3aGVuIGl0cyBiZWluZyBhY3RpdmF0ZWQgKi9cbiAgICAgICAgQ09NUE9ORU5UX0FDVElWQVRFID0gXCJjb21wb25lbnRBY3RpdmF0ZVwiLFxuICAgICAgICAvKiogZGlzcGF0Y2hlZCB0byBhIFtbQ29tcG9uZW50XV0gd2hlbiBpdHMgYmVpbmcgZGVhY3RpdmF0ZWQgKi9cbiAgICAgICAgQ09NUE9ORU5UX0RFQUNUSVZBVEUgPSBcImNvbXBvbmVudERlYWN0aXZhdGVcIixcbiAgICAgICAgLyoqIGRpc3BhdGNoZWQgdG8gYSBjaGlsZCBbW05vZGVdXSBhbmQgaXRzIGFuY2VzdG9ycyBhZnRlciBpdCB3YXMgYXBwZW5kZWQgdG8gYSBwYXJlbnQgKi9cbiAgICAgICAgQ0hJTERfQVBQRU5EID0gXCJjaGlsZEFkZFwiLFxuICAgICAgICAvKiogZGlzcGF0Y2hlZCB0byBhIGNoaWxkIFtbTm9kZV1dIGFuZCBpdHMgYW5jZXN0b3JzIGp1c3QgYmVmb3JlIGl0cyBiZWluZyByZW1vdmVkIGZyb20gaXRzIHBhcmVudCAqL1xuICAgICAgICBDSElMRF9SRU1PVkUgPSBcImNoaWxkUmVtb3ZlXCIsXG4gICAgICAgIC8qKiBkaXNwYXRjaGVkIHRvIGEgW1tNdXRhYmxlXV0gd2hlbiBpdHMgYmVpbmcgbXV0YXRlZCAqL1xuICAgICAgICBNVVRBVEUgPSBcIm11dGF0ZVwiLFxuICAgICAgICAvKiogZGlzcGF0Y2hlZCB0byBbW1ZpZXdwb3J0XV0gd2hlbiBpdCBnZXRzIHRoZSBmb2N1cyB0byByZWNlaXZlIGtleWJvYXJkIGlucHV0ICovXG4gICAgICAgIEZPQ1VTX0lOID0gXCJmb2N1c2luXCIsXG4gICAgICAgIC8qKiBkaXNwYXRjaGVkIHRvIFtbVmlld3BvcnRdXSB3aGVuIGl0IGxvc2VzIHRoZSBmb2N1cyB0byByZWNlaXZlIGtleWJvYXJkIGlucHV0ICovXG4gICAgICAgIEZPQ1VTX09VVCA9IFwiZm9jdXNvdXRcIixcbiAgICAgICAgLyoqIGRpc3BhdGNoZWQgdG8gW1tOb2RlXV0gd2hlbiBpdCdzIGRvbmUgc2VyaWFsaXppbmcgKi9cbiAgICAgICAgTk9ERV9TRVJJQUxJWkVEID0gXCJub2RlU2VyaWFsaXplZFwiLFxuICAgICAgICAvKiogZGlzcGF0Y2hlZCB0byBbW05vZGVdXSB3aGVuIGl0J3MgZG9uZSBkZXNlcmlhbGl6aW5nLCBzbyBhbGwgY29tcG9uZW50cywgY2hpbGRyZW4gYW5kIGF0dHJpYnV0ZXMgYXJlIGF2YWlsYWJsZSAqL1xuICAgICAgICBOT0RFX0RFU0VSSUFMSVpFRCA9IFwibm9kZURlc2VyaWFsaXplZFwiLFxuICAgICAgICAvKiogZGlzcGF0Y2hlZCB0byBbW05vZGVSZXNvdXJjZUluc3RhbmNlXV0gd2hlbiBpdCdzIGNvbnRlbnQgaXMgc2V0IGFjY29yZGluZyB0byBhIHNlcmlhbGl6YXRpb24gb2YgYSBbW05vZGVSZXNvdXJjZV1dICAqL1xuICAgICAgICBOT0RFUkVTT1VSQ0VfSU5TVEFOVElBVEVEID0gXCJub2RlUmVzb3VyY2VJbnN0YW50aWF0ZWRcIixcbiAgICAgICAgLyoqIGRpc3BhdGNoZWQgdG8gW1tUaW1lXV0gd2hlbiBpdCdzIHNjYWxpbmcgY2hhbmdlZCAgKi9cbiAgICAgICAgVElNRV9TQ0FMRUQgPSBcInRpbWVTY2FsZWRcIixcbiAgICAgICAgLyoqIGRpc3BhdGNoZWQgdG8gW1tGaWxlSW9dXSB3aGVuIGEgbGlzdCBvZiBmaWxlcyBoYXMgYmVlbiBsb2FkZWQgICovXG4gICAgICAgIEZJTEVfTE9BREVEID0gXCJmaWxlTG9hZGVkXCIsXG4gICAgICAgIC8qKiBkaXNwYXRjaGVkIHRvIFtbRmlsZUlvXV0gd2hlbiBhIGxpc3Qgb2YgZmlsZXMgaGFzIGJlZW4gc2F2ZWQgKi9cbiAgICAgICAgRklMRV9TQVZFRCA9IFwiZmlsZVNhdmVkXCJcbiAgICB9XG5cbiAgICBleHBvcnQgY29uc3QgZW51bSBFVkVOVF9QT0lOVEVSIHtcbiAgICAgICAgVVAgPSBcIsaScG9pbnRlcnVwXCIsXG4gICAgICAgIERPV04gPSBcIsaScG9pbnRlcmRvd25cIlxuICAgIH1cbiAgICBleHBvcnQgY29uc3QgZW51bSBFVkVOVF9EUkFHRFJPUCB7XG4gICAgICAgIERSQUcgPSBcIsaSZHJhZ1wiLFxuICAgICAgICBEUk9QID0gXCLGkmRyb3BcIixcbiAgICAgICAgU1RBUlQgPSBcIsaSZHJhZ3N0YXJ0XCIsXG4gICAgICAgIEVORCA9IFwixpJkcmFnZW5kXCIsXG4gICAgICAgIE9WRVIgPSBcIsaSZHJhZ292ZXJcIlxuICAgIH1cbiAgICBleHBvcnQgY29uc3QgZW51bSBFVkVOVF9XSEVFTCB7XG4gICAgICAgIFdIRUVMID0gXCLGkndoZWVsXCJcbiAgICB9XG5cbiAgICBleHBvcnQgY2xhc3MgUG9pbnRlckV2ZW50xpIgZXh0ZW5kcyBQb2ludGVyRXZlbnQge1xuICAgICAgICBwdWJsaWMgcG9pbnRlclg6IG51bWJlcjtcbiAgICAgICAgcHVibGljIHBvaW50ZXJZOiBudW1iZXI7XG4gICAgICAgIHB1YmxpYyBjYW52YXNYOiBudW1iZXI7XG4gICAgICAgIHB1YmxpYyBjYW52YXNZOiBudW1iZXI7XG4gICAgICAgIHB1YmxpYyBjbGllbnRSZWN0OiBDbGllbnRSZWN0O1xuXG4gICAgICAgIGNvbnN0cnVjdG9yKHR5cGU6IHN0cmluZywgX2V2ZW50OiBQb2ludGVyRXZlbnTGkikge1xuICAgICAgICAgICAgc3VwZXIodHlwZSwgX2V2ZW50KTtcbiAgICAgICAgICAgIGxldCB0YXJnZXQ6IEhUTUxFbGVtZW50ID0gPEhUTUxFbGVtZW50Pl9ldmVudC50YXJnZXQ7XG4gICAgICAgICAgICB0aGlzLmNsaWVudFJlY3QgPSB0YXJnZXQuZ2V0Q2xpZW50UmVjdHMoKVswXTtcbiAgICAgICAgICAgIHRoaXMucG9pbnRlclggPSBfZXZlbnQuY2xpZW50WCAtIHRoaXMuY2xpZW50UmVjdC5sZWZ0O1xuICAgICAgICAgICAgdGhpcy5wb2ludGVyWSA9IF9ldmVudC5jbGllbnRZIC0gdGhpcy5jbGllbnRSZWN0LnRvcDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGV4cG9ydCBjbGFzcyBEcmFnRHJvcEV2ZW50xpIgZXh0ZW5kcyBEcmFnRXZlbnQge1xuICAgICAgICBwdWJsaWMgcG9pbnRlclg6IG51bWJlcjtcbiAgICAgICAgcHVibGljIHBvaW50ZXJZOiBudW1iZXI7XG4gICAgICAgIHB1YmxpYyBjYW52YXNYOiBudW1iZXI7XG4gICAgICAgIHB1YmxpYyBjYW52YXNZOiBudW1iZXI7XG4gICAgICAgIHB1YmxpYyBjbGllbnRSZWN0OiBDbGllbnRSZWN0O1xuXG4gICAgICAgIGNvbnN0cnVjdG9yKHR5cGU6IHN0cmluZywgX2V2ZW50OiBEcmFnRHJvcEV2ZW50xpIpIHtcbiAgICAgICAgICAgIHN1cGVyKHR5cGUsIF9ldmVudCk7XG4gICAgICAgICAgICBsZXQgdGFyZ2V0OiBIVE1MRWxlbWVudCA9IDxIVE1MRWxlbWVudD5fZXZlbnQudGFyZ2V0O1xuICAgICAgICAgICAgdGhpcy5jbGllbnRSZWN0ID0gdGFyZ2V0LmdldENsaWVudFJlY3RzKClbMF07XG4gICAgICAgICAgICB0aGlzLnBvaW50ZXJYID0gX2V2ZW50LmNsaWVudFggLSB0aGlzLmNsaWVudFJlY3QubGVmdDtcbiAgICAgICAgICAgIHRoaXMucG9pbnRlclkgPSBfZXZlbnQuY2xpZW50WSAtIHRoaXMuY2xpZW50UmVjdC50b3A7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBleHBvcnQgY2xhc3MgV2hlZWxFdmVudMaSIGV4dGVuZHMgV2hlZWxFdmVudCB7XG4gICAgICAgIGNvbnN0cnVjdG9yKHR5cGU6IHN0cmluZywgX2V2ZW50OiBXaGVlbEV2ZW50xpIpIHtcbiAgICAgICAgICAgIHN1cGVyKHR5cGUsIF9ldmVudCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBCYXNlIGNsYXNzIGZvciBFdmVudFRhcmdldCBzaW5nbGV0b25zLCB3aGljaCBhcmUgZml4ZWQgZW50aXRpZXMgaW4gdGhlIHN0cnVjdHVyZSBvZiBGdWRnZSwgc3VjaCBhcyB0aGUgY29yZSBsb29wIFxuICAgICAqL1xuICAgIGV4cG9ydCBjbGFzcyBFdmVudFRhcmdldFN0YXRpYyBleHRlbmRzIEV2ZW50VGFyZ2V0IHtcbiAgICAgICAgcHJvdGVjdGVkIHN0YXRpYyB0YXJnZXRTdGF0aWM6IEV2ZW50VGFyZ2V0U3RhdGljID0gbmV3IEV2ZW50VGFyZ2V0U3RhdGljKCk7XG5cbiAgICAgICAgcHJvdGVjdGVkIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgYWRkRXZlbnRMaXN0ZW5lcihfdHlwZTogc3RyaW5nLCBfaGFuZGxlcjogRXZlbnRMaXN0ZW5lcik6IHZvaWQge1xuICAgICAgICAgICAgRXZlbnRUYXJnZXRTdGF0aWMudGFyZ2V0U3RhdGljLmFkZEV2ZW50TGlzdGVuZXIoX3R5cGUsIF9oYW5kbGVyKTtcbiAgICAgICAgfVxuICAgICAgICBwdWJsaWMgc3RhdGljIHJlbW92ZUV2ZW50TGlzdGVuZXIoX3R5cGU6IHN0cmluZywgX2hhbmRsZXI6IEV2ZW50TGlzdGVuZXIpOiB2b2lkIHtcbiAgICAgICAgICAgIEV2ZW50VGFyZ2V0U3RhdGljLnRhcmdldFN0YXRpYy5yZW1vdmVFdmVudExpc3RlbmVyKF90eXBlLCBfaGFuZGxlcik7XG4gICAgICAgIH1cbiAgICAgICAgcHVibGljIHN0YXRpYyBkaXNwYXRjaEV2ZW50KF9ldmVudDogRXZlbnQpOiBib29sZWFuIHtcbiAgICAgICAgICAgIEV2ZW50VGFyZ2V0U3RhdGljLnRhcmdldFN0YXRpYy5kaXNwYXRjaEV2ZW50KF9ldmVudCk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbn0iLCJuYW1lc3BhY2UgRnVkZ2VDb3JlIHtcbiAgICBleHBvcnQgY2xhc3MgS2V5Ym9hcmRFdmVudMaSIGV4dGVuZHMgS2V5Ym9hcmRFdmVudCB7XG4gICAgICAgIGNvbnN0cnVjdG9yKHR5cGU6IHN0cmluZywgX2V2ZW50OiBLZXlib2FyZEV2ZW50xpIpIHtcbiAgICAgICAgICAgIHN1cGVyKHR5cGUsIF9ldmVudCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNYXBwaW5ncyBvZiBzdGFuZGFyZCBET00vQnJvd3Nlci1FdmVudHMgYXMgcGFzc2VkIGZyb20gYSBjYW52YXMgdG8gdGhlIHZpZXdwb3J0XG4gICAgICovXG4gICAgZXhwb3J0IGNvbnN0IGVudW0gRVZFTlRfS0VZQk9BUkQge1xuICAgICAgICBVUCA9IFwixpJrZXl1cFwiLFxuICAgICAgICBET1dOID0gXCLGkmtleWRvd25cIlxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRoZSBjb2RlcyBzZW50IGZyb20gYSBzdGFuZGFyZCBlbmdsaXNoIGtleWJvYXJkIGxheW91dFxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIEtFWUJPQVJEX0NPREUge1xuICAgICAgICBBID0gXCJLZXlBXCIsXG4gICAgICAgIEIgPSBcIktleUJcIixcbiAgICAgICAgQyA9IFwiS2V5Q1wiLFxuICAgICAgICBEID0gXCJLZXlEXCIsXG4gICAgICAgIEUgPSBcIktleUVcIixcbiAgICAgICAgRiA9IFwiS2V5RlwiLFxuICAgICAgICBHID0gXCJLZXlHXCIsXG4gICAgICAgIEggPSBcIktleUhcIixcbiAgICAgICAgSSA9IFwiS2V5SVwiLFxuICAgICAgICBKID0gXCJLZXlKXCIsXG4gICAgICAgIEsgPSBcIktleUtcIixcbiAgICAgICAgTCA9IFwiS2V5TFwiLFxuICAgICAgICBNID0gXCJLZXlNXCIsXG4gICAgICAgIE4gPSBcIktleU5cIixcbiAgICAgICAgTyA9IFwiS2V5T1wiLFxuICAgICAgICBQID0gXCJLZXlQXCIsXG4gICAgICAgIFEgPSBcIktleVFcIixcbiAgICAgICAgUiA9IFwiS2V5UlwiLFxuICAgICAgICBTID0gXCJLZXlTXCIsXG4gICAgICAgIFQgPSBcIktleVRcIixcbiAgICAgICAgVSA9IFwiS2V5VVwiLFxuICAgICAgICBWID0gXCJLZXlWXCIsXG4gICAgICAgIFcgPSBcIktleVdcIixcbiAgICAgICAgWCA9IFwiS2V5WFwiLFxuICAgICAgICBZID0gXCJLZXlZXCIsXG4gICAgICAgIFogPSBcIktleVpcIixcbiAgICAgICAgRVNDID0gXCJFc2NhcGVcIixcbiAgICAgICAgWkVSTyA9IFwiRGlnaXQwXCIsXG4gICAgICAgIE9ORSA9IFwiRGlnaXQxXCIsXG4gICAgICAgIFRXTyA9IFwiRGlnaXQyXCIsXG4gICAgICAgIFRIUkVFID0gXCJEaWdpdDNcIixcbiAgICAgICAgRk9VUiA9IFwiRGlnaXQ0XCIsXG4gICAgICAgIEZJVkUgPSBcIkRpZ2l0NVwiLFxuICAgICAgICBTSVggPSBcIkRpZ2l0NlwiLFxuICAgICAgICBTRVZFTiA9IFwiRGlnaXQ3XCIsXG4gICAgICAgIEVJR0hUID0gXCJEaWdpdDhcIixcbiAgICAgICAgTklORSA9IFwiRGlnaXQ5XCIsXG4gICAgICAgIE1JTlVTID0gXCJNaW51c1wiLFxuICAgICAgICBFUVVBTCA9IFwiRXF1YWxcIixcbiAgICAgICAgQkFDS1NQQUNFID0gXCJCYWNrc3BhY2VcIixcbiAgICAgICAgVEFCVUxBVE9SID0gXCJUYWJcIixcbiAgICAgICAgQlJBQ0tFVF9MRUZUID0gXCJCcmFja2V0TGVmdFwiLFxuICAgICAgICBCUkFDS0VUX1JJR0hUID0gXCJCcmFja2V0UmlnaHRcIixcbiAgICAgICAgRU5URVIgPSBcIkVudGVyXCIsXG4gICAgICAgIENUUkxfTEVGVCA9IFwiQ29udHJvbExlZnRcIixcbiAgICAgICAgU0VNSUNPTE9OID0gXCJTZW1pY29sb25cIixcbiAgICAgICAgUVVPVEUgPSBcIlF1b3RlXCIsXG4gICAgICAgIEJBQ0tfUVVPVEUgPSBcIkJhY2txdW90ZVwiLFxuICAgICAgICBTSElGVF9MRUZUID0gXCJTaGlmdExlZnRcIixcbiAgICAgICAgQkFDS1NMQVNIID0gXCJCYWNrc2xhc2hcIixcbiAgICAgICAgQ09NTUEgPSBcIkNvbW1hXCIsXG4gICAgICAgIFBFUklPRCA9IFwiUGVyaW9kXCIsXG4gICAgICAgIFNMQVNIID0gXCJTbGFzaFwiLFxuICAgICAgICBTSElGVF9SSUdIVCA9IFwiU2hpZnRSaWdodFwiLFxuICAgICAgICBOVU1QQURfTVVMVElQTFkgPSBcIk51bXBhZE11bHRpcGx5XCIsXG4gICAgICAgIEFMVF9MRUZUID0gXCJBbHRMZWZ0XCIsXG4gICAgICAgIFNQQUNFID0gXCJTcGFjZVwiLFxuICAgICAgICBDQVBTX0xPQ0sgPSBcIkNhcHNMb2NrXCIsXG4gICAgICAgIEYxID0gXCJGMVwiLFxuICAgICAgICBGMiA9IFwiRjJcIixcbiAgICAgICAgRjMgPSBcIkYzXCIsXG4gICAgICAgIEY0ID0gXCJGNFwiLFxuICAgICAgICBGNSA9IFwiRjVcIixcbiAgICAgICAgRjYgPSBcIkY2XCIsXG4gICAgICAgIEY3ID0gXCJGN1wiLFxuICAgICAgICBGOCA9IFwiRjhcIixcbiAgICAgICAgRjkgPSBcIkY5XCIsXG4gICAgICAgIEYxMCA9IFwiRjEwXCIsXG4gICAgICAgIFBBVVNFID0gXCJQYXVzZVwiLFxuICAgICAgICBTQ1JPTExfTE9DSyA9IFwiU2Nyb2xsTG9ja1wiLFxuICAgICAgICBOVU1QQUQ3ID0gXCJOdW1wYWQ3XCIsXG4gICAgICAgIE5VTVBBRDggPSBcIk51bXBhZDhcIixcbiAgICAgICAgTlVNUEFEOSA9IFwiTnVtcGFkOVwiLFxuICAgICAgICBOVU1QQURfU1VCVFJBQ1QgPSBcIk51bXBhZFN1YnRyYWN0XCIsXG4gICAgICAgIE5VTVBBRDQgPSBcIk51bXBhZDRcIixcbiAgICAgICAgTlVNUEFENSA9IFwiTnVtcGFkNVwiLFxuICAgICAgICBOVU1QQUQ2ID0gXCJOdW1wYWQ2XCIsXG4gICAgICAgIE5VTVBBRF9BREQgPSBcIk51bXBhZEFkZFwiLFxuICAgICAgICBOVU1QQUQxID0gXCJOdW1wYWQxXCIsXG4gICAgICAgIE5VTVBBRDIgPSBcIk51bXBhZDJcIixcbiAgICAgICAgTlVNUEFEMyA9IFwiTnVtcGFkM1wiLFxuICAgICAgICBOVU1QQUQwID0gXCJOdW1wYWQwXCIsXG4gICAgICAgIE5VTVBBRF9ERUNJTUFMID0gXCJOdW1wYWREZWNpbWFsXCIsXG4gICAgICAgIFBSSU5UX1NDUkVFTiA9IFwiUHJpbnRTY3JlZW5cIixcbiAgICAgICAgSU5UTF9CQUNLX1NMQVNIID0gXCJJbnRsQmFja1NsYXNoXCIsXG4gICAgICAgIEYxMSA9IFwiRjExXCIsXG4gICAgICAgIEYxMiA9IFwiRjEyXCIsXG4gICAgICAgIE5VTVBBRF9FUVVBTCA9IFwiTnVtcGFkRXF1YWxcIixcbiAgICAgICAgRjEzID0gXCJGMTNcIixcbiAgICAgICAgRjE0ID0gXCJGMTRcIixcbiAgICAgICAgRjE1ID0gXCJGMTVcIixcbiAgICAgICAgRjE2ID0gXCJGMTZcIixcbiAgICAgICAgRjE3ID0gXCJGMTdcIixcbiAgICAgICAgRjE4ID0gXCJGMThcIixcbiAgICAgICAgRjE5ID0gXCJGMTlcIixcbiAgICAgICAgRjIwID0gXCJGMjBcIixcbiAgICAgICAgRjIxID0gXCJGMjFcIixcbiAgICAgICAgRjIyID0gXCJGMjJcIixcbiAgICAgICAgRjIzID0gXCJGMjNcIixcbiAgICAgICAgRjI0ID0gXCJGMjRcIixcbiAgICAgICAgS0FOQV9NT0RFID0gXCJLYW5hTW9kZVwiLFxuICAgICAgICBMQU5HMiA9IFwiTGFuZzJcIixcbiAgICAgICAgTEFORzEgPSBcIkxhbmcxXCIsXG4gICAgICAgIElOVExfUk8gPSBcIkludGxSb1wiLFxuICAgICAgICBDT05WRVJUID0gXCJDb252ZXJ0XCIsXG4gICAgICAgIE5PTl9DT05WRVJUID0gXCJOb25Db252ZXJ0XCIsXG4gICAgICAgIElOVExfWUVOID0gXCJJbnRsWWVuXCIsXG4gICAgICAgIE5VTVBBRF9DT01NQSA9IFwiTnVtcGFkQ29tbWFcIixcbiAgICAgICAgVU5ETyA9IFwiVW5kb1wiLFxuICAgICAgICBQQVNURSA9IFwiUGFzdGVcIixcbiAgICAgICAgTUVESUFfVFJBQ0tfUFJFVklPVVMgPSBcIk1lZGlhVHJhY2tQcmV2aW91c1wiLFxuICAgICAgICBDVVQgPSBcIkN1dFwiLFxuICAgICAgICBDT1BZID0gXCJDb3B5XCIsXG4gICAgICAgIE1FRElBX1RSQUNLX05FWFQgPSBcIk1lZGlhVHJhY2tOZXh0XCIsXG4gICAgICAgIE5VTVBBRF9FTlRFUiA9IFwiTnVtcGFkRW50ZXJcIixcbiAgICAgICAgQ1RSTF9SSUdIVCA9IFwiQ29udHJvbFJpZ2h0XCIsXG4gICAgICAgIEFVRElPX1ZPTFVNRV9NVVRFID0gXCJBdWRpb1ZvbHVtZU11dGVcIixcbiAgICAgICAgTEFVTkNIX0FQUDIgPSBcIkxhdW5jaEFwcDJcIixcbiAgICAgICAgTUVESUFfUExBWV9QQVVTRSA9IFwiTWVkaWFQbGF5UGF1c2VcIixcbiAgICAgICAgTUVESUFfU1RPUCA9IFwiTWVkaWFTdG9wXCIsXG4gICAgICAgIEVKRUNUID0gXCJFamVjdFwiLFxuICAgICAgICBBVURJT19WT0xVTUVfRE9XTiA9IFwiQXVkaW9Wb2x1bWVEb3duXCIsXG4gICAgICAgIFZPTFVNRV9ET1dOID0gXCJWb2x1bWVEb3duXCIsXG4gICAgICAgIEFVRElPX1ZPTFVNRV9VUCA9IFwiQXVkaW9Wb2x1bWVVcFwiLFxuICAgICAgICBWT0xVTUVfVVAgPSBcIlZvbHVtZVVwXCIsXG4gICAgICAgIEJST1dTRVJfSE9NRSA9IFwiQnJvd3NlckhvbWVcIixcbiAgICAgICAgTlVNUEFEX0RJVklERSA9IFwiTnVtcGFkRGl2aWRlXCIsXG4gICAgICAgIEFMVF9SSUdIVCA9IFwiQWx0UmlnaHRcIixcbiAgICAgICAgSEVMUCA9IFwiSGVscFwiLFxuICAgICAgICBOVU1fTE9DSyA9IFwiTnVtTG9ja1wiLFxuICAgICAgICBIT01FID0gXCJIb21lXCIsXG4gICAgICAgIEFSUk9XX1VQID0gXCJBcnJvd1VwXCIsXG4gICAgICAgIEFSUk9XX1JJR0hUID0gXCJBcnJvd1JpZ2h0XCIsXG4gICAgICAgIEFSUk9XX0RPV04gPSBcIkFycm93RG93blwiLFxuICAgICAgICBBUlJPV19MRUZUID0gXCJBcnJvd0xlZnRcIixcbiAgICAgICAgRU5EID0gXCJFbmRcIixcbiAgICAgICAgUEFHRV9VUCA9IFwiUGFnZVVwXCIsXG4gICAgICAgIFBBR0VfRE9XTiA9IFwiUGFnZURvd25cIixcbiAgICAgICAgSU5TRVJUID0gXCJJbnNlcnRcIixcbiAgICAgICAgREVMRVRFID0gXCJEZWxldGVcIixcbiAgICAgICAgTUVUQV9MRUZUID0gXCJNZXRhX0xlZnRcIixcbiAgICAgICAgT1NfTEVGVCA9IFwiT1NMZWZ0XCIsXG4gICAgICAgIE1FVEFfUklHSFQgPSBcIk1ldGFSaWdodFwiLFxuICAgICAgICBPU19SSUdIVCA9IFwiT1NSaWdodFwiLFxuICAgICAgICBDT05URVhUX01FTlUgPSBcIkNvbnRleHRNZW51XCIsXG4gICAgICAgIFBPV0VSID0gXCJQb3dlclwiLFxuICAgICAgICBCUk9XU0VSX1NFQVJDSCA9IFwiQnJvd3NlclNlYXJjaFwiLFxuICAgICAgICBCUk9XU0VSX0ZBVk9SSVRFUyA9IFwiQnJvd3NlckZhdm9yaXRlc1wiLFxuICAgICAgICBCUk9XU0VSX1JFRlJFU0ggPSBcIkJyb3dzZXJSZWZyZXNoXCIsXG4gICAgICAgIEJST1dTRVJfU1RPUCA9IFwiQnJvd3NlclN0b3BcIixcbiAgICAgICAgQlJPV1NFUl9GT1JXQVJEID0gXCJCcm93c2VyRm9yd2FyZFwiLFxuICAgICAgICBCUk9XU0VSX0JBQ0sgPSBcIkJyb3dzZXJCYWNrXCIsXG4gICAgICAgIExBVU5DSF9BUFAxID0gXCJMYXVuY2hBcHAxXCIsXG4gICAgICAgIExBVU5DSF9NQUlMID0gXCJMYXVuY2hNYWlsXCIsXG4gICAgICAgIExBVU5DSF9NRURJQV9QTEFZRVIgPSBcIkxhdW5jaE1lZGlhUGxheWVyXCIsXG5cbiAgICAgICAgLy9tYWMgYnJpbmdzIHRoaXMgYnV0dHRvblxuICAgICAgICBGTiA9IFwiRm5cIiwgLy9ubyBldmVudCBmaXJlZCBhY3R1YWxseVxuXG4gICAgICAgIC8vTGludXggYnJpbmdzIHRoZXNlXG4gICAgICAgIEFHQUlOID0gXCJBZ2FpblwiLFxuICAgICAgICBQUk9QUyA9IFwiUHJvcHNcIixcbiAgICAgICAgU0VMRUNUID0gXCJTZWxlY3RcIixcbiAgICAgICAgT1BFTiA9IFwiT3BlblwiLFxuICAgICAgICBGSU5EID0gXCJGaW5kXCIsXG4gICAgICAgIFdBS0VfVVAgPSBcIldha2VVcFwiLFxuICAgICAgICBOVU1QQURfUEFSRU5UX0xFRlQgPSBcIk51bXBhZFBhcmVudExlZnRcIixcbiAgICAgICAgTlVNUEFEX1BBUkVOVF9SSUdIVCA9IFwiTnVtcGFkUGFyZW50UmlnaHRcIixcblxuICAgICAgICAvL2FuZHJvaWRcbiAgICAgICAgU0xFRVAgPSBcIlNsZWVwXCJcbiAgICB9XG4gICAgLyogXG4gICAgRmlyZWZveCBjYW4ndCBtYWtlIHVzZSBvZiB0aG9zZSBidXR0b25zIGFuZCBDb21iaW5hdGlvbnM6XG4gICAgU0lOR0VMRV9CVVRUT05TOlxuICAgICBEcnVjayxcbiAgICBDT01CSU5BVElPTlM6XG4gICAgIFNoaWZ0ICsgRjEwLCBTaGlmdCArIE51bXBhZDUsXG4gICAgIENUUkwgKyBxLCBDVFJMICsgRjQsXG4gICAgIEFMVCArIEYxLCBBTFQgKyBGMiwgQUxUICsgRjMsIEFMVCArIEY3LCBBTFQgKyBGOCwgQUxUICsgRjEwXG4gICAgT3BlcmEgd29uJ3QgZG8gZ29vZCB3aXRoIHRoZXNlIEJ1dHRvbnMgYW5kIGNvbWJpbmF0aW9uczpcbiAgICBTSU5HTEVfQlVUVE9OUzpcbiAgICAgRmxvYXQzMkFycmF5LCBGMTEsIEFMVCxcbiAgICBDT01CSU5BVElPTlM6XG4gICAgIENUUkwgKyBxLCBDVFJMICsgdCwgQ1RSTCArIGgsIENUUkwgKyBnLCBDVFJMICsgbiwgQ1RSTCArIGYgXG4gICAgIEFMVCArIEYxLCBBTFQgKyBGMiwgQUxUICsgRjQsIEFMVCArIEY1LCBBTFQgKyBGNiwgQUxUICsgRjcsIEFMVCArIEY4LCBBTFQgKyBGMTBcbiAgICAgKi9cbn0iLCJuYW1lc3BhY2UgRnVkZ2VDb3JlIHtcbiAgICBleHBvcnQgaW50ZXJmYWNlIEJvcmRlciB7XG4gICAgICAgIGxlZnQ6IG51bWJlcjtcbiAgICAgICAgdG9wOiBudW1iZXI7XG4gICAgICAgIHJpZ2h0OiBudW1iZXI7XG4gICAgICAgIGJvdHRvbTogbnVtYmVyO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZyYW1pbmcgZGVzY3JpYmVzIGhvdyB0byBtYXAgYSByZWN0YW5nbGUgaW50byBhIGdpdmVuIGZyYW1lXG4gICAgICogYW5kIGhvdyBwb2ludHMgaW4gdGhlIGZyYW1lIGNvcnJlc3BvbmQgdG8gcG9pbnRzIGluIHRoZSByZXN1bHRpbmcgcmVjdGFuZ2xlIFxuICAgICAqL1xuICAgIGV4cG9ydCBhYnN0cmFjdCBjbGFzcyBGcmFtaW5nIGV4dGVuZHMgTXV0YWJsZSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBNYXBzIGEgcG9pbnQgaW4gdGhlIGdpdmVuIGZyYW1lIGFjY29yZGluZyB0byB0aGlzIGZyYW1pbmdcbiAgICAgICAgICogQHBhcmFtIF9wb2ludEluRnJhbWUgVGhlIHBvaW50IGluIHRoZSBmcmFtZSBnaXZlblxuICAgICAgICAgKiBAcGFyYW0gX3JlY3RGcmFtZSBUaGUgZnJhbWUgdGhlIHBvaW50IGlzIHJlbGF0aXZlIHRvXG4gICAgICAgICAqL1xuICAgICAgICBwdWJsaWMgYWJzdHJhY3QgZ2V0UG9pbnQoX3BvaW50SW5GcmFtZTogVmVjdG9yMiwgX3JlY3RGcmFtZTogUmVjdGFuZ2xlKTogVmVjdG9yMjtcblxuICAgICAgICAvKipcbiAgICAgICAgICogTWFwcyBhIHBvaW50IGluIGEgZ2l2ZW4gcmVjdGFuZ2xlIGJhY2sgdG8gYSBjYWxjdWxhdGVkIGZyYW1lIG9mIG9yaWdpblxuICAgICAgICAgKiBAcGFyYW0gX3BvaW50IFRoZSBwb2ludCBpbiB0aGUgcmVjdGFuZ2xlXG4gICAgICAgICAqIEBwYXJhbSBfcmVjdCBUaGUgcmVjdGFuZ2xlIHRoZSBwb2ludCBpcyByZWxhdGl2ZSB0b1xuICAgICAgICAgKi9cbiAgICAgICAgcHVibGljIGFic3RyYWN0IGdldFBvaW50SW52ZXJzZShfcG9pbnQ6IFZlY3RvcjIsIF9yZWN0OiBSZWN0YW5nbGUpOiBWZWN0b3IyO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUYWtlcyBhIHJlY3RhbmdsZSBhcyB0aGUgZnJhbWUgYW5kIGNyZWF0ZXMgYSBuZXcgcmVjdGFuZ2xlIGFjY29yZGluZyB0byB0aGUgZnJhbWluZ1xuICAgICAgICAgKiBAcGFyYW0gX3JlY3RGcmFtZVxuICAgICAgICAgKi9cbiAgICAgICAgcHVibGljIGFic3RyYWN0IGdldFJlY3QoX3JlY3RGcmFtZTogUmVjdGFuZ2xlKTogUmVjdGFuZ2xlO1xuICAgICAgICBwcm90ZWN0ZWQgcmVkdWNlTXV0YXRvcihfbXV0YXRvcjogTXV0YXRvcik6IHZvaWQgey8qKiAqLyB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVGhlIHJlc3VsdGluZyByZWN0YW5nbGUgaGFzIGEgZml4ZWQgd2lkdGggYW5kIGhlaWdodCBhbmQgZGlzcGxheSBzaG91bGQgc2NhbGUgdG8gZml0IHRoZSBmcmFtZVxuICAgICAqIFBvaW50cyBhcmUgc2NhbGVkIGluIHRoZSBzYW1lIHJhdGlvXG4gICAgICovXG4gICAgZXhwb3J0IGNsYXNzIEZyYW1pbmdGaXhlZCBleHRlbmRzIEZyYW1pbmcge1xuICAgICAgICBwdWJsaWMgd2lkdGg6IG51bWJlciA9IDMwMDtcbiAgICAgICAgcHVibGljIGhlaWdodDogbnVtYmVyID0gMTUwO1xuXG4gICAgICAgIHB1YmxpYyBzZXRTaXplKF93aWR0aDogbnVtYmVyLCBfaGVpZ2h0OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgICAgIHRoaXMud2lkdGggPSBfd2lkdGg7XG4gICAgICAgICAgICB0aGlzLmhlaWdodCA9IF9oZWlnaHQ7XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgZ2V0UG9pbnQoX3BvaW50SW5GcmFtZTogVmVjdG9yMiwgX3JlY3RGcmFtZTogUmVjdGFuZ2xlKTogVmVjdG9yMiB7XG4gICAgICAgICAgICBsZXQgcmVzdWx0OiBWZWN0b3IyID0gbmV3IFZlY3RvcjIoXG4gICAgICAgICAgICAgICAgdGhpcy53aWR0aCAqIChfcG9pbnRJbkZyYW1lLnggLSBfcmVjdEZyYW1lLngpIC8gX3JlY3RGcmFtZS53aWR0aCxcbiAgICAgICAgICAgICAgICB0aGlzLmhlaWdodCAqIChfcG9pbnRJbkZyYW1lLnkgLSBfcmVjdEZyYW1lLnkpIC8gX3JlY3RGcmFtZS5oZWlnaHRcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG5cbiAgICAgICAgcHVibGljIGdldFBvaW50SW52ZXJzZShfcG9pbnQ6IFZlY3RvcjIsIF9yZWN0OiBSZWN0YW5nbGUpOiBWZWN0b3IyIHtcbiAgICAgICAgICAgIGxldCByZXN1bHQ6IFZlY3RvcjIgPSBuZXcgVmVjdG9yMihcbiAgICAgICAgICAgICAgICBfcG9pbnQueCAqIF9yZWN0LndpZHRoIC8gdGhpcy53aWR0aCArIF9yZWN0LngsXG4gICAgICAgICAgICAgICAgX3BvaW50LnkgKiBfcmVjdC5oZWlnaHQgLyB0aGlzLmhlaWdodCArIF9yZWN0LnlcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG5cbiAgICAgICAgcHVibGljIGdldFJlY3QoX3JlY3RGcmFtZTogUmVjdGFuZ2xlKTogUmVjdGFuZ2xlIHtcbiAgICAgICAgICAgIHJldHVybiBSZWN0YW5nbGUuR0VUKDAsIDAsIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBXaWR0aCBhbmQgaGVpZ2h0IG9mIHRoZSByZXN1bHRpbmcgcmVjdGFuZ2xlIGFyZSBmcmFjdGlvbnMgb2YgdGhvc2Ugb2YgdGhlIGZyYW1lLCBzY2FsZWQgYnkgbm9ybWVkIHZhbHVlcyBub3JtV2lkdGggYW5kIG5vcm1IZWlnaHQuXG4gICAgICogRGlzcGxheSBzaG91bGQgc2NhbGUgdG8gZml0IHRoZSBmcmFtZSBhbmQgcG9pbnRzIGFyZSBzY2FsZWQgaW4gdGhlIHNhbWUgcmF0aW9cbiAgICAgKi9cbiAgICBleHBvcnQgY2xhc3MgRnJhbWluZ1NjYWxlZCBleHRlbmRzIEZyYW1pbmcge1xuICAgICAgICBwdWJsaWMgbm9ybVdpZHRoOiBudW1iZXIgPSAxLjA7XG4gICAgICAgIHB1YmxpYyBub3JtSGVpZ2h0OiBudW1iZXIgPSAxLjA7XG5cbiAgICAgICAgcHVibGljIHNldFNjYWxlKF9ub3JtV2lkdGg6IG51bWJlciwgX25vcm1IZWlnaHQ6IG51bWJlcik6IHZvaWQge1xuICAgICAgICAgICAgdGhpcy5ub3JtV2lkdGggPSBfbm9ybVdpZHRoO1xuICAgICAgICAgICAgdGhpcy5ub3JtSGVpZ2h0ID0gX25vcm1IZWlnaHQ7XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgZ2V0UG9pbnQoX3BvaW50SW5GcmFtZTogVmVjdG9yMiwgX3JlY3RGcmFtZTogUmVjdGFuZ2xlKTogVmVjdG9yMiB7XG4gICAgICAgICAgICBsZXQgcmVzdWx0OiBWZWN0b3IyID0gbmV3IFZlY3RvcjIoXG4gICAgICAgICAgICAgICAgdGhpcy5ub3JtV2lkdGggKiAoX3BvaW50SW5GcmFtZS54IC0gX3JlY3RGcmFtZS54KSxcbiAgICAgICAgICAgICAgICB0aGlzLm5vcm1IZWlnaHQgKiAoX3BvaW50SW5GcmFtZS55IC0gX3JlY3RGcmFtZS55KVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgZ2V0UG9pbnRJbnZlcnNlKF9wb2ludDogVmVjdG9yMiwgX3JlY3Q6IFJlY3RhbmdsZSk6IFZlY3RvcjIge1xuICAgICAgICAgICAgbGV0IHJlc3VsdDogVmVjdG9yMiA9IG5ldyBWZWN0b3IyKFxuICAgICAgICAgICAgICAgIF9wb2ludC54IC8gdGhpcy5ub3JtV2lkdGggKyBfcmVjdC54LFxuICAgICAgICAgICAgICAgIF9wb2ludC55IC8gdGhpcy5ub3JtSGVpZ2h0ICsgX3JlY3QueVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgZ2V0UmVjdChfcmVjdEZyYW1lOiBSZWN0YW5nbGUpOiBSZWN0YW5nbGUge1xuICAgICAgICAgICAgcmV0dXJuIFJlY3RhbmdsZS5HRVQoMCwgMCwgdGhpcy5ub3JtV2lkdGggKiBfcmVjdEZyYW1lLndpZHRoLCB0aGlzLm5vcm1IZWlnaHQgKiBfcmVjdEZyYW1lLmhlaWdodCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUaGUgcmVzdWx0aW5nIHJlY3RhbmdsZSBmaXRzIGludG8gYSBtYXJnaW4gZ2l2ZW4gYXMgZnJhY3Rpb25zIG9mIHRoZSBzaXplIG9mIHRoZSBmcmFtZSBnaXZlbiBieSBub3JtQW5jaG9yXG4gICAgICogcGx1cyBhbiBhYnNvbHV0ZSBwYWRkaW5nIGdpdmVuIGJ5IHBpeGVsQm9yZGVyLiBEaXNwbGF5IHNob3VsZCBmaXQgaW50byB0aGlzLlxuICAgICAqL1xuICAgIGV4cG9ydCBjbGFzcyBGcmFtaW5nQ29tcGxleCBleHRlbmRzIEZyYW1pbmcge1xuICAgICAgICBwdWJsaWMgbWFyZ2luOiBCb3JkZXIgPSB7IGxlZnQ6IDAsIHRvcDogMCwgcmlnaHQ6IDAsIGJvdHRvbTogMCB9O1xuICAgICAgICBwdWJsaWMgcGFkZGluZzogQm9yZGVyID0geyBsZWZ0OiAwLCB0b3A6IDAsIHJpZ2h0OiAwLCBib3R0b206IDAgfTtcblxuICAgICAgICBwdWJsaWMgZ2V0UG9pbnQoX3BvaW50SW5GcmFtZTogVmVjdG9yMiwgX3JlY3RGcmFtZTogUmVjdGFuZ2xlKTogVmVjdG9yMiB7XG4gICAgICAgICAgICBsZXQgcmVzdWx0OiBWZWN0b3IyID0gbmV3IFZlY3RvcjIoXG4gICAgICAgICAgICAgICAgX3BvaW50SW5GcmFtZS54IC0gdGhpcy5wYWRkaW5nLmxlZnQgLSB0aGlzLm1hcmdpbi5sZWZ0ICogX3JlY3RGcmFtZS53aWR0aCxcbiAgICAgICAgICAgICAgICBfcG9pbnRJbkZyYW1lLnkgLSB0aGlzLnBhZGRpbmcudG9wIC0gdGhpcy5tYXJnaW4udG9wICogX3JlY3RGcmFtZS5oZWlnaHRcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG4gICAgICAgIHB1YmxpYyBnZXRQb2ludEludmVyc2UoX3BvaW50OiBWZWN0b3IyLCBfcmVjdDogUmVjdGFuZ2xlKTogVmVjdG9yMiB7XG4gICAgICAgICAgICBsZXQgcmVzdWx0OiBWZWN0b3IyID0gbmV3IFZlY3RvcjIoXG4gICAgICAgICAgICAgICAgX3BvaW50LnggKyB0aGlzLnBhZGRpbmcubGVmdCArIHRoaXMubWFyZ2luLmxlZnQgKiBfcmVjdC53aWR0aCxcbiAgICAgICAgICAgICAgICBfcG9pbnQueSArIHRoaXMucGFkZGluZy50b3AgKyB0aGlzLm1hcmdpbi50b3AgKiBfcmVjdC5oZWlnaHRcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG5cbiAgICAgICAgcHVibGljIGdldFJlY3QoX3JlY3RGcmFtZTogUmVjdGFuZ2xlKTogUmVjdGFuZ2xlIHtcbiAgICAgICAgICAgIGlmICghX3JlY3RGcmFtZSlcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcblxuICAgICAgICAgICAgbGV0IG1pblg6IG51bWJlciA9IF9yZWN0RnJhbWUueCArIHRoaXMubWFyZ2luLmxlZnQgKiBfcmVjdEZyYW1lLndpZHRoICsgdGhpcy5wYWRkaW5nLmxlZnQ7XG4gICAgICAgICAgICBsZXQgbWluWTogbnVtYmVyID0gX3JlY3RGcmFtZS55ICsgdGhpcy5tYXJnaW4udG9wICogX3JlY3RGcmFtZS5oZWlnaHQgKyB0aGlzLnBhZGRpbmcudG9wO1xuICAgICAgICAgICAgbGV0IG1heFg6IG51bWJlciA9IF9yZWN0RnJhbWUueCArICgxIC0gdGhpcy5tYXJnaW4ucmlnaHQpICogX3JlY3RGcmFtZS53aWR0aCAtIHRoaXMucGFkZGluZy5yaWdodDtcbiAgICAgICAgICAgIGxldCBtYXhZOiBudW1iZXIgPSBfcmVjdEZyYW1lLnkgKyAoMSAtIHRoaXMubWFyZ2luLmJvdHRvbSkgKiBfcmVjdEZyYW1lLmhlaWdodCAtIHRoaXMucGFkZGluZy5ib3R0b207XG5cbiAgICAgICAgICAgIHJldHVybiBSZWN0YW5nbGUuR0VUKG1pblgsIG1pblksIG1heFggLSBtaW5YLCBtYXhZIC0gbWluWSk7XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgZ2V0TXV0YXRvcigpOiBNdXRhdG9yIHtcbiAgICAgICAgICAgIHJldHVybiB7IG1hcmdpbjogdGhpcy5tYXJnaW4sIHBhZGRpbmc6IHRoaXMucGFkZGluZyB9O1xuICAgICAgICB9XG4gICAgfVxufSIsIm5hbWVzcGFjZSBGdWRnZUNvcmUge1xuXG4gICAgLyoqXG4gICAgICogU2ltcGxlIGNsYXNzIGZvciAzeDMgbWF0cml4IG9wZXJhdGlvbnMgKFRoaXMgY2xhc3MgY2FuIG9ubHkgaGFuZGxlIDJEXG4gICAgICogdHJhbnNmb3JtYXRpb25zLiBDb3VsZCBiZSByZW1vdmVkIGFmdGVyIGFwcGx5aW5nIGZ1bGwgMkQgY29tcGF0aWJpbGl0eSB0byBNYXQ0KS5cbiAgICAgKiBAYXV0aG9ycyBKYXNjaGEgS2FyYWfDtmwsIEhGVSwgMjAxOSB8IEppcmthIERlbGwnT3JvLUZyaWVkbCwgSEZVLCAyMDE5XG4gICAgICovXG4gICAgZXhwb3J0IGNsYXNzIE1hdHJpeDN4MyB7XG5cbiAgICAgICAgcHVibGljIGRhdGE6IG51bWJlcltdO1xuXG4gICAgICAgIHB1YmxpYyBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgICAgIHRoaXMuZGF0YSA9IFtcbiAgICAgICAgICAgICAgICAxLCAwLCAwLFxuICAgICAgICAgICAgICAgIDAsIDEsIDAsXG4gICAgICAgICAgICAgICAgMCwgMCwgMVxuICAgICAgICAgICAgXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgcHJvamVjdGlvbihfd2lkdGg6IG51bWJlciwgX2hlaWdodDogbnVtYmVyKTogTWF0cml4M3gzIHtcbiAgICAgICAgICAgIGxldCBtYXRyaXg6IE1hdHJpeDN4MyA9IG5ldyBNYXRyaXgzeDM7XG4gICAgICAgICAgICBtYXRyaXguZGF0YSA9IFtcbiAgICAgICAgICAgICAgICAyIC8gX3dpZHRoLCAwLCAwLFxuICAgICAgICAgICAgICAgIDAsIC0yIC8gX2hlaWdodCwgMCxcbiAgICAgICAgICAgICAgICAtMSwgMSwgMVxuICAgICAgICAgICAgXTtcbiAgICAgICAgICAgIHJldHVybiBtYXRyaXg7XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgZ2V0IERhdGEoKTogbnVtYmVyW10ge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGF0YTtcbiAgICAgICAgfVxuXG4gICAgICAgIHB1YmxpYyBpZGVudGl0eSgpOiBNYXRyaXgzeDMge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBNYXRyaXgzeDM7XG4gICAgICAgIH1cbiAgICAgICAgcHVibGljIHRyYW5zbGF0ZShfbWF0cml4OiBNYXRyaXgzeDMsIF94VHJhbnNsYXRpb246IG51bWJlciwgX3lUcmFuc2xhdGlvbjogbnVtYmVyKTogTWF0cml4M3gzIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm11bHRpcGx5KF9tYXRyaXgsIHRoaXMudHJhbnNsYXRpb24oX3hUcmFuc2xhdGlvbiwgX3lUcmFuc2xhdGlvbikpO1xuICAgICAgICB9XG5cbiAgICAgICAgcHVibGljIHJvdGF0ZShfbWF0cml4OiBNYXRyaXgzeDMsIF9hbmdsZUluRGVncmVlczogbnVtYmVyKTogTWF0cml4M3gzIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm11bHRpcGx5KF9tYXRyaXgsIHRoaXMucm90YXRpb24oX2FuZ2xlSW5EZWdyZWVzKSk7XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgc2NhbGUoX21hdHJpeDogTWF0cml4M3gzLCBfeFNjYWxlOiBudW1iZXIsIF95c2NhbGU6IG51bWJlcik6IE1hdHJpeDN4MyB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5tdWx0aXBseShfbWF0cml4LCB0aGlzLnNjYWxpbmcoX3hTY2FsZSwgX3lzY2FsZSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgcHVibGljIG11bHRpcGx5KF9hOiBNYXRyaXgzeDMsIF9iOiBNYXRyaXgzeDMpOiBNYXRyaXgzeDMge1xuICAgICAgICAgICAgbGV0IGEwMDogbnVtYmVyID0gX2EuZGF0YVswICogMyArIDBdO1xuICAgICAgICAgICAgbGV0IGEwMTogbnVtYmVyID0gX2EuZGF0YVswICogMyArIDFdO1xuICAgICAgICAgICAgbGV0IGEwMjogbnVtYmVyID0gX2EuZGF0YVswICogMyArIDJdO1xuICAgICAgICAgICAgbGV0IGExMDogbnVtYmVyID0gX2EuZGF0YVsxICogMyArIDBdO1xuICAgICAgICAgICAgbGV0IGExMTogbnVtYmVyID0gX2EuZGF0YVsxICogMyArIDFdO1xuICAgICAgICAgICAgbGV0IGExMjogbnVtYmVyID0gX2EuZGF0YVsxICogMyArIDJdO1xuICAgICAgICAgICAgbGV0IGEyMDogbnVtYmVyID0gX2EuZGF0YVsyICogMyArIDBdO1xuICAgICAgICAgICAgbGV0IGEyMTogbnVtYmVyID0gX2EuZGF0YVsyICogMyArIDFdO1xuICAgICAgICAgICAgbGV0IGEyMjogbnVtYmVyID0gX2EuZGF0YVsyICogMyArIDJdO1xuICAgICAgICAgICAgbGV0IGIwMDogbnVtYmVyID0gX2IuZGF0YVswICogMyArIDBdO1xuICAgICAgICAgICAgbGV0IGIwMTogbnVtYmVyID0gX2IuZGF0YVswICogMyArIDFdO1xuICAgICAgICAgICAgbGV0IGIwMjogbnVtYmVyID0gX2IuZGF0YVswICogMyArIDJdO1xuICAgICAgICAgICAgbGV0IGIxMDogbnVtYmVyID0gX2IuZGF0YVsxICogMyArIDBdO1xuICAgICAgICAgICAgbGV0IGIxMTogbnVtYmVyID0gX2IuZGF0YVsxICogMyArIDFdO1xuICAgICAgICAgICAgbGV0IGIxMjogbnVtYmVyID0gX2IuZGF0YVsxICogMyArIDJdO1xuICAgICAgICAgICAgbGV0IGIyMDogbnVtYmVyID0gX2IuZGF0YVsyICogMyArIDBdO1xuICAgICAgICAgICAgbGV0IGIyMTogbnVtYmVyID0gX2IuZGF0YVsyICogMyArIDFdO1xuICAgICAgICAgICAgbGV0IGIyMjogbnVtYmVyID0gX2IuZGF0YVsyICogMyArIDJdO1xuICAgICAgICAgICAgbGV0IG1hdHJpeDogTWF0cml4M3gzID0gbmV3IE1hdHJpeDN4MztcbiAgICAgICAgICAgIG1hdHJpeC5kYXRhID0gW1xuICAgICAgICAgICAgICAgIGIwMCAqIGEwMCArIGIwMSAqIGExMCArIGIwMiAqIGEyMCxcbiAgICAgICAgICAgICAgICBiMDAgKiBhMDEgKyBiMDEgKiBhMTEgKyBiMDIgKiBhMjEsXG4gICAgICAgICAgICAgICAgYjAwICogYTAyICsgYjAxICogYTEyICsgYjAyICogYTIyLFxuICAgICAgICAgICAgICAgIGIxMCAqIGEwMCArIGIxMSAqIGExMCArIGIxMiAqIGEyMCxcbiAgICAgICAgICAgICAgICBiMTAgKiBhMDEgKyBiMTEgKiBhMTEgKyBiMTIgKiBhMjEsXG4gICAgICAgICAgICAgICAgYjEwICogYTAyICsgYjExICogYTEyICsgYjEyICogYTIyLFxuICAgICAgICAgICAgICAgIGIyMCAqIGEwMCArIGIyMSAqIGExMCArIGIyMiAqIGEyMCxcbiAgICAgICAgICAgICAgICBiMjAgKiBhMDEgKyBiMjEgKiBhMTEgKyBiMjIgKiBhMjEsXG4gICAgICAgICAgICAgICAgYjIwICogYTAyICsgYjIxICogYTEyICsgYjIyICogYTIyXG4gICAgICAgICAgICBdO1xuICAgICAgICAgICAgcmV0dXJuIG1hdHJpeDtcbiAgICAgICAgfVxuXG4gICAgICAgIHByaXZhdGUgdHJhbnNsYXRpb24oX3hUcmFuc2xhdGlvbjogbnVtYmVyLCBfeVRyYW5zbGF0aW9uOiBudW1iZXIpOiBNYXRyaXgzeDMge1xuICAgICAgICAgICAgbGV0IG1hdHJpeDogTWF0cml4M3gzID0gbmV3IE1hdHJpeDN4MztcbiAgICAgICAgICAgIG1hdHJpeC5kYXRhID0gW1xuICAgICAgICAgICAgICAgIDEsIDAsIDAsXG4gICAgICAgICAgICAgICAgMCwgMSwgMCxcbiAgICAgICAgICAgICAgICBfeFRyYW5zbGF0aW9uLCBfeVRyYW5zbGF0aW9uLCAxXG4gICAgICAgICAgICBdO1xuICAgICAgICAgICAgcmV0dXJuIG1hdHJpeDtcbiAgICAgICAgfVxuXG4gICAgICAgIHByaXZhdGUgc2NhbGluZyhfeFNjYWxlOiBudW1iZXIsIF95U2NhbGU6IG51bWJlcik6IE1hdHJpeDN4MyB7XG4gICAgICAgICAgICBsZXQgbWF0cml4OiBNYXRyaXgzeDMgPSBuZXcgTWF0cml4M3gzO1xuICAgICAgICAgICAgbWF0cml4LmRhdGEgPSBbXG4gICAgICAgICAgICAgICAgX3hTY2FsZSwgMCwgMCxcbiAgICAgICAgICAgICAgICAwLCBfeVNjYWxlLCAwLFxuICAgICAgICAgICAgICAgIDAsIDAsIDFcbiAgICAgICAgICAgIF07XG4gICAgICAgICAgICByZXR1cm4gbWF0cml4O1xuICAgICAgICB9XG5cbiAgICAgICAgcHJpdmF0ZSByb3RhdGlvbihfYW5nbGVJbkRlZ3JlZXM6IG51bWJlcik6IE1hdHJpeDN4MyB7XG4gICAgICAgICAgICBsZXQgYW5nbGVJbkRlZ3JlZXM6IG51bWJlciA9IDM2MCAtIF9hbmdsZUluRGVncmVlcztcbiAgICAgICAgICAgIGxldCBhbmdsZUluUmFkaWFuczogbnVtYmVyID0gYW5nbGVJbkRlZ3JlZXMgKiBNYXRoLlBJIC8gMTgwO1xuICAgICAgICAgICAgbGV0IHNpbjogbnVtYmVyID0gTWF0aC5zaW4oYW5nbGVJblJhZGlhbnMpO1xuICAgICAgICAgICAgbGV0IGNvczogbnVtYmVyID0gTWF0aC5jb3MoYW5nbGVJblJhZGlhbnMpO1xuICAgICAgICAgICAgbGV0IG1hdHJpeDogTWF0cml4M3gzID0gbmV3IE1hdHJpeDN4MztcbiAgICAgICAgICAgIG1hdHJpeC5kYXRhID0gW1xuICAgICAgICAgICAgICAgIGNvcywgLXNpbiwgMCxcbiAgICAgICAgICAgICAgICBzaW4sIGNvcywgMCxcbiAgICAgICAgICAgICAgICAwLCAwLCAxXG4gICAgICAgICAgICBdO1xuICAgICAgICAgICAgcmV0dXJuIG1hdHJpeDtcbiAgICAgICAgfVxuXG5cbiAgICB9XG5cbn1cbiIsIm5hbWVzcGFjZSBGdWRnZUNvcmUge1xuXG4gIC8qKlxuICAgKiBSZXByZXNlbnRzIHRoZSBtYXRyaXggYXMgdHJhbnNsYXRpb24sIHJvdGF0aW9uIGFuZCBzY2FsaW5nIHZlY3RvciwgYmVpbmcgY2FsY3VsYXRlZCBmcm9tIHRoZSBtYXRyaXhcbiAgICovXG4gIGludGVyZmFjZSBWZWN0b3JSZXByZXNlbnRhdGlvbiB7XG4gICAgdHJhbnNsYXRpb246IFZlY3RvcjM7XG4gICAgcm90YXRpb246IFZlY3RvcjM7XG4gICAgc2NhbGluZzogVmVjdG9yMztcbiAgfVxuXG4gIC8qKlxuICAgKiBTdG9yZXMgYSA0eDQgdHJhbnNmb3JtYXRpb24gbWF0cml4IGFuZCBwcm92aWRlcyBvcGVyYXRpb25zIGZvciBpdC5cbiAgICogYGBgcGxhaW50ZXh0XG4gICAqIFsgMCwgMSwgMiwgMyBdIOKGkCByb3cgdmVjdG9yIHhcbiAgICogWyA0LCA1LCA2LCA3IF0g4oaQIHJvdyB2ZWN0b3IgeVxuICAgKiBbIDgsIDksMTAsMTEgXSDihpAgcm93IHZlY3RvciB6XG4gICAqIFsxMiwxMywxNCwxNSBdIOKGkCB0cmFuc2xhdGlvblxuICAgKiAgICAgICAgICAgIOKGkSAgaG9tb2dlbmVvdXMgY29sdW1uXG4gICAqIGBgYFxuICAgKiBAYXV0aG9ycyBKYXNjaGEgS2FyYWfDtmwsIEhGVSwgMjAxOSB8IEppcmthIERlbGwnT3JvLUZyaWVkbCwgSEZVLCAyMDE5XG4gICAqL1xuXG4gIGV4cG9ydCBjbGFzcyBNYXRyaXg0eDQgZXh0ZW5kcyBNdXRhYmxlIGltcGxlbWVudHMgU2VyaWFsaXphYmxlIHtcbiAgICBwcml2YXRlIGRhdGE6IEZsb2F0MzJBcnJheSA9IG5ldyBGbG9hdDMyQXJyYXkoMTYpOyAvLyBUaGUgZGF0YSBvZiB0aGUgbWF0cml4LlxuICAgIHByaXZhdGUgbXV0YXRvcjogTXV0YXRvciA9IG51bGw7IC8vIHByZXBhcmVkIGZvciBvcHRpbWl6YXRpb24sIGtlZXAgbXV0YXRvciB0byByZWR1Y2UgcmVkdW5kYW50IGNhbGN1bGF0aW9uIGFuZCBmb3IgY29tcGFyaXNvbi4gU2V0IHRvIG51bGwgd2hlbiBkYXRhIGNoYW5nZXMhXG4gICAgcHJpdmF0ZSB2ZWN0b3JzOiBWZWN0b3JSZXByZXNlbnRhdGlvbjsgLy8gdmVjdG9yIHJlcHJlc2VudGF0aW9uIG9mIFxuXG4gICAgcHVibGljIGNvbnN0cnVjdG9yKCkge1xuICAgICAgc3VwZXIoKTtcbiAgICAgIHRoaXMuZGF0YS5zZXQoW1xuICAgICAgICAxLCAwLCAwLCAwLFxuICAgICAgICAwLCAxLCAwLCAwLFxuICAgICAgICAwLCAwLCAxLCAwLFxuICAgICAgICAwLCAwLCAwLCAxXG4gICAgICBdKTtcbiAgICAgIHRoaXMucmVzZXRDYWNoZSgpO1xuICAgIH1cblxuICAgIC8qKiBcbiAgICAgKiAtIGdldDogYSBjb3B5IG9mIHRoZSBjYWxjdWxhdGVkIHRyYW5zbGF0aW9uIHZlY3RvciAgIFxuICAgICAqIC0gc2V0OiBlZmZlY3QgdGhlIG1hdHJpeCBpZ25vcmluZyBpdHMgcm90YXRpb24gYW5kIHNjYWxpbmdcbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0IHRyYW5zbGF0aW9uKCk6IFZlY3RvcjMge1xuICAgICAgaWYgKCF0aGlzLnZlY3RvcnMudHJhbnNsYXRpb24pXG4gICAgICAgIHRoaXMudmVjdG9ycy50cmFuc2xhdGlvbiA9IG5ldyBWZWN0b3IzKHRoaXMuZGF0YVsxMl0sIHRoaXMuZGF0YVsxM10sIHRoaXMuZGF0YVsxNF0pO1xuICAgICAgcmV0dXJuIHRoaXMudmVjdG9ycy50cmFuc2xhdGlvbi5jb3B5O1xuICAgIH1cbiAgICBwdWJsaWMgc2V0IHRyYW5zbGF0aW9uKF90cmFuc2xhdGlvbjogVmVjdG9yMykge1xuICAgICAgdGhpcy5kYXRhLnNldChfdHJhbnNsYXRpb24uZ2V0KCksIDEyKTtcbiAgICAgIC8vIG5vIGZ1bGwgY2FjaGUgcmVzZXQgcmVxdWlyZWRcbiAgICAgIHRoaXMudmVjdG9ycy50cmFuc2xhdGlvbiA9IF90cmFuc2xhdGlvbjtcbiAgICAgIHRoaXMubXV0YXRvciA9IG51bGw7XG4gICAgfVxuXG4gICAgLyoqIFxuICAgICAqIC0gZ2V0OiBhIGNvcHkgb2YgdGhlIGNhbGN1bGF0ZWQgcm90YXRpb24gdmVjdG9yICAgXG4gICAgICogLSBzZXQ6IGVmZmVjdCB0aGUgbWF0cml4XG4gICAgICovXG4gICAgcHVibGljIGdldCByb3RhdGlvbigpOiBWZWN0b3IzIHtcbiAgICAgIGlmICghdGhpcy52ZWN0b3JzLnJvdGF0aW9uKVxuICAgICAgICB0aGlzLnZlY3RvcnMucm90YXRpb24gPSB0aGlzLmdldEV1bGVyQW5nbGVzKCk7XG4gICAgICByZXR1cm4gdGhpcy52ZWN0b3JzLnJvdGF0aW9uLmNvcHk7XG4gICAgfVxuICAgIHB1YmxpYyBzZXQgcm90YXRpb24oX3JvdGF0aW9uOiBWZWN0b3IzKSB7XG4gICAgICB0aGlzLm11dGF0ZSh7IFwicm90YXRpb25cIjogX3JvdGF0aW9uIH0pO1xuICAgICAgdGhpcy5yZXNldENhY2hlKCk7XG4gICAgfVxuXG4gICAgLyoqIFxuICAgICAqIC0gZ2V0OiBhIGNvcHkgb2YgdGhlIGNhbGN1bGF0ZWQgc2NhbGUgdmVjdG9yICAgXG4gICAgICogLSBzZXQ6IGVmZmVjdCB0aGUgbWF0cml4XG4gICAgICovXG4gICAgcHVibGljIGdldCBzY2FsaW5nKCk6IFZlY3RvcjMge1xuICAgICAgaWYgKCF0aGlzLnZlY3RvcnMuc2NhbGluZylcbiAgICAgICAgdGhpcy52ZWN0b3JzLnNjYWxpbmcgPSBuZXcgVmVjdG9yMyhcbiAgICAgICAgICBNYXRoLmh5cG90KHRoaXMuZGF0YVswXSwgdGhpcy5kYXRhWzFdLCB0aGlzLmRhdGFbMl0pLFxuICAgICAgICAgIE1hdGguaHlwb3QodGhpcy5kYXRhWzRdLCB0aGlzLmRhdGFbNV0sIHRoaXMuZGF0YVs2XSksXG4gICAgICAgICAgTWF0aC5oeXBvdCh0aGlzLmRhdGFbOF0sIHRoaXMuZGF0YVs5XSwgdGhpcy5kYXRhWzEwXSlcbiAgICAgICAgKTtcbiAgICAgIHJldHVybiB0aGlzLnZlY3RvcnMuc2NhbGluZy5jb3B5O1xuICAgIH1cbiAgICBwdWJsaWMgc2V0IHNjYWxpbmcoX3NjYWxpbmc6IFZlY3RvcjMpIHtcbiAgICAgIHRoaXMubXV0YXRlKHsgXCJzY2FsaW5nXCI6IF9zY2FsaW5nIH0pO1xuICAgICAgdGhpcy5yZXNldENhY2hlKCk7XG4gICAgfVxuXG4gICAgLy8jcmVnaW9uIFNUQVRJQ1NcbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZSBhIG5ldyBpZGVudGl0eSBtYXRyaXhcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGdldCBJREVOVElUWSgpOiBNYXRyaXg0eDQge1xuICAgICAgLy8gY29uc3QgcmVzdWx0OiBNYXRyaXg0eDQgPSBuZXcgTWF0cml4NHg0KCk7XG4gICAgICBjb25zdCByZXN1bHQ6IE1hdHJpeDR4NCA9IFJlY3ljbGVyLmdldChNYXRyaXg0eDQpO1xuICAgICAgcmVzdWx0LmRhdGEuc2V0KFtcbiAgICAgICAgMSwgMCwgMCwgMCxcbiAgICAgICAgMCwgMSwgMCwgMCxcbiAgICAgICAgMCwgMCwgMSwgMCxcbiAgICAgICAgMCwgMCwgMCwgMVxuICAgICAgXSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvbXB1dGVzIGFuZCByZXR1cm5zIHRoZSBwcm9kdWN0IG9mIHR3byBwYXNzZWQgbWF0cmljZXMuXG4gICAgICogQHBhcmFtIF9hIFRoZSBtYXRyaXggdG8gbXVsdGlwbHkuXG4gICAgICogQHBhcmFtIF9iIFRoZSBtYXRyaXggdG8gbXVsdGlwbHkgYnkuXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBNVUxUSVBMSUNBVElPTihfYTogTWF0cml4NHg0LCBfYjogTWF0cml4NHg0KTogTWF0cml4NHg0IHtcbiAgICAgIGxldCBhOiBGbG9hdDMyQXJyYXkgPSBfYS5kYXRhO1xuICAgICAgbGV0IGI6IEZsb2F0MzJBcnJheSA9IF9iLmRhdGE7XG4gICAgICAvLyBsZXQgbWF0cml4OiBNYXRyaXg0eDQgPSBuZXcgTWF0cml4NHg0KCk7XG4gICAgICBjb25zdCBtYXRyaXg6IE1hdHJpeDR4NCA9IFJlY3ljbGVyLmdldChNYXRyaXg0eDQpO1xuICAgICAgbGV0IGEwMDogbnVtYmVyID0gYVswICogNCArIDBdO1xuICAgICAgbGV0IGEwMTogbnVtYmVyID0gYVswICogNCArIDFdO1xuICAgICAgbGV0IGEwMjogbnVtYmVyID0gYVswICogNCArIDJdO1xuICAgICAgbGV0IGEwMzogbnVtYmVyID0gYVswICogNCArIDNdO1xuICAgICAgbGV0IGExMDogbnVtYmVyID0gYVsxICogNCArIDBdO1xuICAgICAgbGV0IGExMTogbnVtYmVyID0gYVsxICogNCArIDFdO1xuICAgICAgbGV0IGExMjogbnVtYmVyID0gYVsxICogNCArIDJdO1xuICAgICAgbGV0IGExMzogbnVtYmVyID0gYVsxICogNCArIDNdO1xuICAgICAgbGV0IGEyMDogbnVtYmVyID0gYVsyICogNCArIDBdO1xuICAgICAgbGV0IGEyMTogbnVtYmVyID0gYVsyICogNCArIDFdO1xuICAgICAgbGV0IGEyMjogbnVtYmVyID0gYVsyICogNCArIDJdO1xuICAgICAgbGV0IGEyMzogbnVtYmVyID0gYVsyICogNCArIDNdO1xuICAgICAgbGV0IGEzMDogbnVtYmVyID0gYVszICogNCArIDBdO1xuICAgICAgbGV0IGEzMTogbnVtYmVyID0gYVszICogNCArIDFdO1xuICAgICAgbGV0IGEzMjogbnVtYmVyID0gYVszICogNCArIDJdO1xuICAgICAgbGV0IGEzMzogbnVtYmVyID0gYVszICogNCArIDNdO1xuICAgICAgbGV0IGIwMDogbnVtYmVyID0gYlswICogNCArIDBdO1xuICAgICAgbGV0IGIwMTogbnVtYmVyID0gYlswICogNCArIDFdO1xuICAgICAgbGV0IGIwMjogbnVtYmVyID0gYlswICogNCArIDJdO1xuICAgICAgbGV0IGIwMzogbnVtYmVyID0gYlswICogNCArIDNdO1xuICAgICAgbGV0IGIxMDogbnVtYmVyID0gYlsxICogNCArIDBdO1xuICAgICAgbGV0IGIxMTogbnVtYmVyID0gYlsxICogNCArIDFdO1xuICAgICAgbGV0IGIxMjogbnVtYmVyID0gYlsxICogNCArIDJdO1xuICAgICAgbGV0IGIxMzogbnVtYmVyID0gYlsxICogNCArIDNdO1xuICAgICAgbGV0IGIyMDogbnVtYmVyID0gYlsyICogNCArIDBdO1xuICAgICAgbGV0IGIyMTogbnVtYmVyID0gYlsyICogNCArIDFdO1xuICAgICAgbGV0IGIyMjogbnVtYmVyID0gYlsyICogNCArIDJdO1xuICAgICAgbGV0IGIyMzogbnVtYmVyID0gYlsyICogNCArIDNdO1xuICAgICAgbGV0IGIzMDogbnVtYmVyID0gYlszICogNCArIDBdO1xuICAgICAgbGV0IGIzMTogbnVtYmVyID0gYlszICogNCArIDFdO1xuICAgICAgbGV0IGIzMjogbnVtYmVyID0gYlszICogNCArIDJdO1xuICAgICAgbGV0IGIzMzogbnVtYmVyID0gYlszICogNCArIDNdO1xuICAgICAgbWF0cml4LmRhdGEuc2V0KFxuICAgICAgICBbXG4gICAgICAgICAgYjAwICogYTAwICsgYjAxICogYTEwICsgYjAyICogYTIwICsgYjAzICogYTMwLFxuICAgICAgICAgIGIwMCAqIGEwMSArIGIwMSAqIGExMSArIGIwMiAqIGEyMSArIGIwMyAqIGEzMSxcbiAgICAgICAgICBiMDAgKiBhMDIgKyBiMDEgKiBhMTIgKyBiMDIgKiBhMjIgKyBiMDMgKiBhMzIsXG4gICAgICAgICAgYjAwICogYTAzICsgYjAxICogYTEzICsgYjAyICogYTIzICsgYjAzICogYTMzLFxuICAgICAgICAgIGIxMCAqIGEwMCArIGIxMSAqIGExMCArIGIxMiAqIGEyMCArIGIxMyAqIGEzMCxcbiAgICAgICAgICBiMTAgKiBhMDEgKyBiMTEgKiBhMTEgKyBiMTIgKiBhMjEgKyBiMTMgKiBhMzEsXG4gICAgICAgICAgYjEwICogYTAyICsgYjExICogYTEyICsgYjEyICogYTIyICsgYjEzICogYTMyLFxuICAgICAgICAgIGIxMCAqIGEwMyArIGIxMSAqIGExMyArIGIxMiAqIGEyMyArIGIxMyAqIGEzMyxcbiAgICAgICAgICBiMjAgKiBhMDAgKyBiMjEgKiBhMTAgKyBiMjIgKiBhMjAgKyBiMjMgKiBhMzAsXG4gICAgICAgICAgYjIwICogYTAxICsgYjIxICogYTExICsgYjIyICogYTIxICsgYjIzICogYTMxLFxuICAgICAgICAgIGIyMCAqIGEwMiArIGIyMSAqIGExMiArIGIyMiAqIGEyMiArIGIyMyAqIGEzMixcbiAgICAgICAgICBiMjAgKiBhMDMgKyBiMjEgKiBhMTMgKyBiMjIgKiBhMjMgKyBiMjMgKiBhMzMsXG4gICAgICAgICAgYjMwICogYTAwICsgYjMxICogYTEwICsgYjMyICogYTIwICsgYjMzICogYTMwLFxuICAgICAgICAgIGIzMCAqIGEwMSArIGIzMSAqIGExMSArIGIzMiAqIGEyMSArIGIzMyAqIGEzMSxcbiAgICAgICAgICBiMzAgKiBhMDIgKyBiMzEgKiBhMTIgKyBiMzIgKiBhMjIgKyBiMzMgKiBhMzIsXG4gICAgICAgICAgYjMwICogYTAzICsgYjMxICogYTEzICsgYjMyICogYTIzICsgYjMzICogYTMzXG4gICAgICAgIF0pO1xuICAgICAgcmV0dXJuIG1hdHJpeDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb21wdXRlcyBhbmQgcmV0dXJucyB0aGUgaW52ZXJzZSBvZiBhIHBhc3NlZCBtYXRyaXguXG4gICAgICogQHBhcmFtIF9tYXRyaXggVGhlIG1hdHJpeCB0byBjb21wdXRlIHRoZSBpbnZlcnNlIG9mLlxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgSU5WRVJTSU9OKF9tYXRyaXg6IE1hdHJpeDR4NCk6IE1hdHJpeDR4NCB7XG4gICAgICBsZXQgbTogRmxvYXQzMkFycmF5ID0gX21hdHJpeC5kYXRhO1xuICAgICAgbGV0IG0wMDogbnVtYmVyID0gbVswICogNCArIDBdO1xuICAgICAgbGV0IG0wMTogbnVtYmVyID0gbVswICogNCArIDFdO1xuICAgICAgbGV0IG0wMjogbnVtYmVyID0gbVswICogNCArIDJdO1xuICAgICAgbGV0IG0wMzogbnVtYmVyID0gbVswICogNCArIDNdO1xuICAgICAgbGV0IG0xMDogbnVtYmVyID0gbVsxICogNCArIDBdO1xuICAgICAgbGV0IG0xMTogbnVtYmVyID0gbVsxICogNCArIDFdO1xuICAgICAgbGV0IG0xMjogbnVtYmVyID0gbVsxICogNCArIDJdO1xuICAgICAgbGV0IG0xMzogbnVtYmVyID0gbVsxICogNCArIDNdO1xuICAgICAgbGV0IG0yMDogbnVtYmVyID0gbVsyICogNCArIDBdO1xuICAgICAgbGV0IG0yMTogbnVtYmVyID0gbVsyICogNCArIDFdO1xuICAgICAgbGV0IG0yMjogbnVtYmVyID0gbVsyICogNCArIDJdO1xuICAgICAgbGV0IG0yMzogbnVtYmVyID0gbVsyICogNCArIDNdO1xuICAgICAgbGV0IG0zMDogbnVtYmVyID0gbVszICogNCArIDBdO1xuICAgICAgbGV0IG0zMTogbnVtYmVyID0gbVszICogNCArIDFdO1xuICAgICAgbGV0IG0zMjogbnVtYmVyID0gbVszICogNCArIDJdO1xuICAgICAgbGV0IG0zMzogbnVtYmVyID0gbVszICogNCArIDNdO1xuICAgICAgbGV0IHRtcDA6IG51bWJlciA9IG0yMiAqIG0zMztcbiAgICAgIGxldCB0bXAxOiBudW1iZXIgPSBtMzIgKiBtMjM7XG4gICAgICBsZXQgdG1wMjogbnVtYmVyID0gbTEyICogbTMzO1xuICAgICAgbGV0IHRtcDM6IG51bWJlciA9IG0zMiAqIG0xMztcbiAgICAgIGxldCB0bXA0OiBudW1iZXIgPSBtMTIgKiBtMjM7XG4gICAgICBsZXQgdG1wNTogbnVtYmVyID0gbTIyICogbTEzO1xuICAgICAgbGV0IHRtcDY6IG51bWJlciA9IG0wMiAqIG0zMztcbiAgICAgIGxldCB0bXA3OiBudW1iZXIgPSBtMzIgKiBtMDM7XG4gICAgICBsZXQgdG1wODogbnVtYmVyID0gbTAyICogbTIzO1xuICAgICAgbGV0IHRtcDk6IG51bWJlciA9IG0yMiAqIG0wMztcbiAgICAgIGxldCB0bXAxMDogbnVtYmVyID0gbTAyICogbTEzO1xuICAgICAgbGV0IHRtcDExOiBudW1iZXIgPSBtMTIgKiBtMDM7XG4gICAgICBsZXQgdG1wMTI6IG51bWJlciA9IG0yMCAqIG0zMTtcbiAgICAgIGxldCB0bXAxMzogbnVtYmVyID0gbTMwICogbTIxO1xuICAgICAgbGV0IHRtcDE0OiBudW1iZXIgPSBtMTAgKiBtMzE7XG4gICAgICBsZXQgdG1wMTU6IG51bWJlciA9IG0zMCAqIG0xMTtcbiAgICAgIGxldCB0bXAxNjogbnVtYmVyID0gbTEwICogbTIxO1xuICAgICAgbGV0IHRtcDE3OiBudW1iZXIgPSBtMjAgKiBtMTE7XG4gICAgICBsZXQgdG1wMTg6IG51bWJlciA9IG0wMCAqIG0zMTtcbiAgICAgIGxldCB0bXAxOTogbnVtYmVyID0gbTMwICogbTAxO1xuICAgICAgbGV0IHRtcDIwOiBudW1iZXIgPSBtMDAgKiBtMjE7XG4gICAgICBsZXQgdG1wMjE6IG51bWJlciA9IG0yMCAqIG0wMTtcbiAgICAgIGxldCB0bXAyMjogbnVtYmVyID0gbTAwICogbTExO1xuICAgICAgbGV0IHRtcDIzOiBudW1iZXIgPSBtMTAgKiBtMDE7XG5cbiAgICAgIGxldCB0MDogbnVtYmVyID0gKHRtcDAgKiBtMTEgKyB0bXAzICogbTIxICsgdG1wNCAqIG0zMSkgLVxuICAgICAgICAodG1wMSAqIG0xMSArIHRtcDIgKiBtMjEgKyB0bXA1ICogbTMxKTtcblxuICAgICAgbGV0IHQxOiBudW1iZXIgPSAodG1wMSAqIG0wMSArIHRtcDYgKiBtMjEgKyB0bXA5ICogbTMxKSAtXG4gICAgICAgICh0bXAwICogbTAxICsgdG1wNyAqIG0yMSArIHRtcDggKiBtMzEpO1xuICAgICAgbGV0IHQyOiBudW1iZXIgPSAodG1wMiAqIG0wMSArIHRtcDcgKiBtMTEgKyB0bXAxMCAqIG0zMSkgLVxuICAgICAgICAodG1wMyAqIG0wMSArIHRtcDYgKiBtMTEgKyB0bXAxMSAqIG0zMSk7XG4gICAgICBsZXQgdDM6IG51bWJlciA9ICh0bXA1ICogbTAxICsgdG1wOCAqIG0xMSArIHRtcDExICogbTIxKSAtXG4gICAgICAgICh0bXA0ICogbTAxICsgdG1wOSAqIG0xMSArIHRtcDEwICogbTIxKTtcblxuICAgICAgbGV0IGQ6IG51bWJlciA9IDEuMCAvIChtMDAgKiB0MCArIG0xMCAqIHQxICsgbTIwICogdDIgKyBtMzAgKiB0Myk7XG5cbiAgICAgIC8vIGxldCBtYXRyaXg6IE1hdHJpeDR4NCA9IG5ldyBNYXRyaXg0eDQ7XG4gICAgICBjb25zdCBtYXRyaXg6IE1hdHJpeDR4NCA9IFJlY3ljbGVyLmdldChNYXRyaXg0eDQpO1xuICAgICAgbWF0cml4LmRhdGEuc2V0KFtcbiAgICAgICAgZCAqIHQwLCAvLyBbMF1cbiAgICAgICAgZCAqIHQxLCAvLyBbMV1cbiAgICAgICAgZCAqIHQyLCAvLyBbMl1cbiAgICAgICAgZCAqIHQzLCAvLyBbM11cbiAgICAgICAgZCAqICgodG1wMSAqIG0xMCArIHRtcDIgKiBtMjAgKyB0bXA1ICogbTMwKSAtICh0bXAwICogbTEwICsgdG1wMyAqIG0yMCArIHRtcDQgKiBtMzApKSwgICAgICAgIC8vIFs0XVxuICAgICAgICBkICogKCh0bXAwICogbTAwICsgdG1wNyAqIG0yMCArIHRtcDggKiBtMzApIC0gKHRtcDEgKiBtMDAgKyB0bXA2ICogbTIwICsgdG1wOSAqIG0zMCkpLCAgICAgICAgLy8gWzVdXG4gICAgICAgIGQgKiAoKHRtcDMgKiBtMDAgKyB0bXA2ICogbTEwICsgdG1wMTEgKiBtMzApIC0gKHRtcDIgKiBtMDAgKyB0bXA3ICogbTEwICsgdG1wMTAgKiBtMzApKSwgICAgICAvLyBbNl1cbiAgICAgICAgZCAqICgodG1wNCAqIG0wMCArIHRtcDkgKiBtMTAgKyB0bXAxMCAqIG0yMCkgLSAodG1wNSAqIG0wMCArIHRtcDggKiBtMTAgKyB0bXAxMSAqIG0yMCkpLCAgICAgIC8vIFs3XVxuICAgICAgICBkICogKCh0bXAxMiAqIG0xMyArIHRtcDE1ICogbTIzICsgdG1wMTYgKiBtMzMpIC0gKHRtcDEzICogbTEzICsgdG1wMTQgKiBtMjMgKyB0bXAxNyAqIG0zMykpLCAgLy8gWzhdXG4gICAgICAgIGQgKiAoKHRtcDEzICogbTAzICsgdG1wMTggKiBtMjMgKyB0bXAyMSAqIG0zMykgLSAodG1wMTIgKiBtMDMgKyB0bXAxOSAqIG0yMyArIHRtcDIwICogbTMzKSksICAvLyBbOV1cbiAgICAgICAgZCAqICgodG1wMTQgKiBtMDMgKyB0bXAxOSAqIG0xMyArIHRtcDIyICogbTMzKSAtICh0bXAxNSAqIG0wMyArIHRtcDE4ICogbTEzICsgdG1wMjMgKiBtMzMpKSwgIC8vIFsxMF1cbiAgICAgICAgZCAqICgodG1wMTcgKiBtMDMgKyB0bXAyMCAqIG0xMyArIHRtcDIzICogbTIzKSAtICh0bXAxNiAqIG0wMyArIHRtcDIxICogbTEzICsgdG1wMjIgKiBtMjMpKSwgIC8vIFsxMV1cbiAgICAgICAgZCAqICgodG1wMTQgKiBtMjIgKyB0bXAxNyAqIG0zMiArIHRtcDEzICogbTEyKSAtICh0bXAxNiAqIG0zMiArIHRtcDEyICogbTEyICsgdG1wMTUgKiBtMjIpKSwgIC8vIFsxMl1cbiAgICAgICAgZCAqICgodG1wMjAgKiBtMzIgKyB0bXAxMiAqIG0wMiArIHRtcDE5ICogbTIyKSAtICh0bXAxOCAqIG0yMiArIHRtcDIxICogbTMyICsgdG1wMTMgKiBtMDIpKSwgIC8vIFsxM11cbiAgICAgICAgZCAqICgodG1wMTggKiBtMTIgKyB0bXAyMyAqIG0zMiArIHRtcDE1ICogbTAyKSAtICh0bXAyMiAqIG0zMiArIHRtcDE0ICogbTAyICsgdG1wMTkgKiBtMTIpKSwgIC8vIFsxNF1cbiAgICAgICAgZCAqICgodG1wMjIgKiBtMjIgKyB0bXAxNiAqIG0wMiArIHRtcDIxICogbTEyKSAtICh0bXAyMCAqIG0xMiArIHRtcDIzICogbTIyICsgdG1wMTcgKiBtMDIpKSAgLy8gWzE1XVxuICAgICAgXSk7XG4gICAgICByZXR1cm4gbWF0cml4O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvbXB1dGVzIGFuZCByZXR1cm5zIGEgcm90YXRpb25tYXRyaXggdGhhdCBhbGlnbnMgYSB0cmFuc2Zvcm1hdGlvbnMgei1heGlzIHdpdGggdGhlIHZlY3RvciBiZXR3ZWVuIGl0IGFuZCBpdHMgdGFyZ2V0LlxuICAgICAqIEBwYXJhbSBfdHJhbnNmb3JtUG9zaXRpb24gVGhlIHgseSBhbmQgei1jb29yZGluYXRlcyBvZiB0aGUgb2JqZWN0IHRvIHJvdGF0ZS5cbiAgICAgKiBAcGFyYW0gX3RhcmdldFBvc2l0aW9uIFRoZSBwb3NpdGlvbiB0byBsb29rIGF0LlxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgTE9PS19BVChfdHJhbnNmb3JtUG9zaXRpb246IFZlY3RvcjMsIF90YXJnZXRQb3NpdGlvbjogVmVjdG9yMywgX3VwOiBWZWN0b3IzID0gVmVjdG9yMy5ZKCkpOiBNYXRyaXg0eDQge1xuICAgICAgLy8gY29uc3QgbWF0cml4OiBNYXRyaXg0eDQgPSBuZXcgTWF0cml4NHg0O1xuICAgICAgY29uc3QgbWF0cml4OiBNYXRyaXg0eDQgPSBSZWN5Y2xlci5nZXQoTWF0cml4NHg0KTtcbiAgICAgIGxldCB6QXhpczogVmVjdG9yMyA9IFZlY3RvcjMuRElGRkVSRU5DRShfdHJhbnNmb3JtUG9zaXRpb24sIF90YXJnZXRQb3NpdGlvbik7XG4gICAgICB6QXhpcy5ub3JtYWxpemUoKTtcbiAgICAgIGxldCB4QXhpczogVmVjdG9yMyA9IFZlY3RvcjMuTk9STUFMSVpBVElPTihWZWN0b3IzLkNST1NTKF91cCwgekF4aXMpKTtcbiAgICAgIGxldCB5QXhpczogVmVjdG9yMyA9IFZlY3RvcjMuTk9STUFMSVpBVElPTihWZWN0b3IzLkNST1NTKHpBeGlzLCB4QXhpcykpO1xuICAgICAgbWF0cml4LmRhdGEuc2V0KFxuICAgICAgICBbXG4gICAgICAgICAgeEF4aXMueCwgeEF4aXMueSwgeEF4aXMueiwgMCxcbiAgICAgICAgICB5QXhpcy54LCB5QXhpcy55LCB5QXhpcy56LCAwLFxuICAgICAgICAgIHpBeGlzLngsIHpBeGlzLnksIHpBeGlzLnosIDAsXG4gICAgICAgICAgX3RyYW5zZm9ybVBvc2l0aW9uLngsXG4gICAgICAgICAgX3RyYW5zZm9ybVBvc2l0aW9uLnksXG4gICAgICAgICAgX3RyYW5zZm9ybVBvc2l0aW9uLnosXG4gICAgICAgICAgMVxuICAgICAgICBdKTtcbiAgICAgIHJldHVybiBtYXRyaXg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBhIG1hdHJpeCB0aGF0IHRyYW5zbGF0ZXMgY29vcmRpbmF0ZXMgYWxvbmcgdGhlIHgtLCB5LSBhbmQgei1heGlzIGFjY29yZGluZyB0byB0aGUgZ2l2ZW4gdmVjdG9yLlxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgVFJBTlNMQVRJT04oX3RyYW5zbGF0ZTogVmVjdG9yMyk6IE1hdHJpeDR4NCB7XG4gICAgICAvLyBsZXQgbWF0cml4OiBNYXRyaXg0eDQgPSBuZXcgTWF0cml4NHg0O1xuICAgICAgY29uc3QgbWF0cml4OiBNYXRyaXg0eDQgPSBSZWN5Y2xlci5nZXQoTWF0cml4NHg0KTtcbiAgICAgIG1hdHJpeC5kYXRhLnNldChbXG4gICAgICAgIDEsIDAsIDAsIDAsXG4gICAgICAgIDAsIDEsIDAsIDAsXG4gICAgICAgIDAsIDAsIDEsIDAsXG4gICAgICAgIF90cmFuc2xhdGUueCwgX3RyYW5zbGF0ZS55LCBfdHJhbnNsYXRlLnosIDFcbiAgICAgIF0pO1xuICAgICAgcmV0dXJuIG1hdHJpeDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgbWF0cml4IHRoYXQgcm90YXRlcyBjb29yZGluYXRlcyBvbiB0aGUgeC1heGlzIHdoZW4gbXVsdGlwbGllZCBieS5cbiAgICAgKiBAcGFyYW0gX2FuZ2xlSW5EZWdyZWVzIFRoZSB2YWx1ZSBvZiB0aGUgcm90YXRpb24uXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBST1RBVElPTl9YKF9hbmdsZUluRGVncmVlczogbnVtYmVyKTogTWF0cml4NHg0IHtcbiAgICAgIC8vIGNvbnN0IG1hdHJpeDogTWF0cml4NHg0ID0gbmV3IE1hdHJpeDR4NDtcbiAgICAgIGNvbnN0IG1hdHJpeDogTWF0cml4NHg0ID0gUmVjeWNsZXIuZ2V0KE1hdHJpeDR4NCk7XG4gICAgICBsZXQgYW5nbGVJblJhZGlhbnM6IG51bWJlciA9IF9hbmdsZUluRGVncmVlcyAqIE1hdGguUEkgLyAxODA7XG4gICAgICBsZXQgc2luOiBudW1iZXIgPSBNYXRoLnNpbihhbmdsZUluUmFkaWFucyk7XG4gICAgICBsZXQgY29zOiBudW1iZXIgPSBNYXRoLmNvcyhhbmdsZUluUmFkaWFucyk7XG4gICAgICBtYXRyaXguZGF0YS5zZXQoW1xuICAgICAgICAxLCAwLCAwLCAwLFxuICAgICAgICAwLCBjb3MsIHNpbiwgMCxcbiAgICAgICAgMCwgLXNpbiwgY29zLCAwLFxuICAgICAgICAwLCAwLCAwLCAxXG4gICAgICBdKTtcbiAgICAgIHJldHVybiBtYXRyaXg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBhIG1hdHJpeCB0aGF0IHJvdGF0ZXMgY29vcmRpbmF0ZXMgb24gdGhlIHktYXhpcyB3aGVuIG11bHRpcGxpZWQgYnkuXG4gICAgICogQHBhcmFtIF9hbmdsZUluRGVncmVlcyBUaGUgdmFsdWUgb2YgdGhlIHJvdGF0aW9uLlxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgUk9UQVRJT05fWShfYW5nbGVJbkRlZ3JlZXM6IG51bWJlcik6IE1hdHJpeDR4NCB7XG4gICAgICAvLyBjb25zdCBtYXRyaXg6IE1hdHJpeDR4NCA9IG5ldyBNYXRyaXg0eDQ7XG4gICAgICBsZXQgbWF0cml4OiBNYXRyaXg0eDQgPSBSZWN5Y2xlci5nZXQoTWF0cml4NHg0KTtcbiAgICAgIGxldCBhbmdsZUluUmFkaWFuczogbnVtYmVyID0gX2FuZ2xlSW5EZWdyZWVzICogTWF0aC5QSSAvIDE4MDtcbiAgICAgIGxldCBzaW46IG51bWJlciA9IE1hdGguc2luKGFuZ2xlSW5SYWRpYW5zKTtcbiAgICAgIGxldCBjb3M6IG51bWJlciA9IE1hdGguY29zKGFuZ2xlSW5SYWRpYW5zKTtcbiAgICAgIG1hdHJpeC5kYXRhLnNldChbXG4gICAgICAgIGNvcywgMCwgLXNpbiwgMCxcbiAgICAgICAgMCwgMSwgMCwgMCxcbiAgICAgICAgc2luLCAwLCBjb3MsIDAsXG4gICAgICAgIDAsIDAsIDAsIDFcbiAgICAgIF0pO1xuICAgICAgcmV0dXJuIG1hdHJpeDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgbWF0cml4IHRoYXQgcm90YXRlcyBjb29yZGluYXRlcyBvbiB0aGUgei1heGlzIHdoZW4gbXVsdGlwbGllZCBieS5cbiAgICAgKiBAcGFyYW0gX2FuZ2xlSW5EZWdyZWVzIFRoZSB2YWx1ZSBvZiB0aGUgcm90YXRpb24uXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBST1RBVElPTl9aKF9hbmdsZUluRGVncmVlczogbnVtYmVyKTogTWF0cml4NHg0IHtcbiAgICAgIC8vIGNvbnN0IG1hdHJpeDogTWF0cml4NHg0ID0gbmV3IE1hdHJpeDR4NDtcbiAgICAgIGNvbnN0IG1hdHJpeDogTWF0cml4NHg0ID0gUmVjeWNsZXIuZ2V0KE1hdHJpeDR4NCk7XG4gICAgICBsZXQgYW5nbGVJblJhZGlhbnM6IG51bWJlciA9IF9hbmdsZUluRGVncmVlcyAqIE1hdGguUEkgLyAxODA7XG4gICAgICBsZXQgc2luOiBudW1iZXIgPSBNYXRoLnNpbihhbmdsZUluUmFkaWFucyk7XG4gICAgICBsZXQgY29zOiBudW1iZXIgPSBNYXRoLmNvcyhhbmdsZUluUmFkaWFucyk7XG4gICAgICBtYXRyaXguZGF0YS5zZXQoW1xuICAgICAgICBjb3MsIHNpbiwgMCwgMCxcbiAgICAgICAgLXNpbiwgY29zLCAwLCAwLFxuICAgICAgICAwLCAwLCAxLCAwLFxuICAgICAgICAwLCAwLCAwLCAxXG4gICAgICBdKTtcbiAgICAgIHJldHVybiBtYXRyaXg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBhIG1hdHJpeCB0aGF0IHNjYWxlcyBjb29yZGluYXRlcyBhbG9uZyB0aGUgeC0sIHktIGFuZCB6LWF4aXMgYWNjb3JkaW5nIHRvIHRoZSBnaXZlbiB2ZWN0b3JcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIFNDQUxJTkcoX3NjYWxhcjogVmVjdG9yMyk6IE1hdHJpeDR4NCB7XG4gICAgICAvLyBjb25zdCBtYXRyaXg6IE1hdHJpeDR4NCA9IG5ldyBNYXRyaXg0eDQ7XG4gICAgICBjb25zdCBtYXRyaXg6IE1hdHJpeDR4NCA9IFJlY3ljbGVyLmdldChNYXRyaXg0eDQpO1xuICAgICAgbWF0cml4LmRhdGEuc2V0KFtcbiAgICAgICAgX3NjYWxhci54LCAwLCAwLCAwLFxuICAgICAgICAwLCBfc2NhbGFyLnksIDAsIDAsXG4gICAgICAgIDAsIDAsIF9zY2FsYXIueiwgMCxcbiAgICAgICAgMCwgMCwgMCwgMVxuICAgICAgXSk7XG4gICAgICByZXR1cm4gbWF0cml4O1xuICAgIH1cbiAgICAvLyNlbmRyZWdpb25cblxuICAgIC8vI3JlZ2lvbiBQUk9KRUNUSU9OU1xuICAgIC8qKlxuICAgICAqIENvbXB1dGVzIGFuZCByZXR1cm5zIGEgbWF0cml4IHRoYXQgYXBwbGllcyBwZXJzcGVjdGl2ZSB0byBhbiBvYmplY3QsIGlmIGl0cyB0cmFuc2Zvcm0gaXMgbXVsdGlwbGllZCBieSBpdC5cbiAgICAgKiBAcGFyYW0gX2FzcGVjdCBUaGUgYXNwZWN0IHJhdGlvIGJldHdlZW4gd2lkdGggYW5kIGhlaWdodCBvZiBwcm9qZWN0aW9uc3BhY2UuKERlZmF1bHQgPSBjYW52YXMuY2xpZW50V2lkdGggLyBjYW52YXMuQ2xpZW50SGVpZ2h0KVxuICAgICAqIEBwYXJhbSBfZmllbGRPZlZpZXdJbkRlZ3JlZXMgVGhlIGZpZWxkIG9mIHZpZXcgaW4gRGVncmVlcy4gKERlZmF1bHQgPSA0NSlcbiAgICAgKiBAcGFyYW0gX25lYXIgVGhlIG5lYXIgY2xpcHNwYWNlIGJvcmRlciBvbiB0aGUgei1heGlzLlxuICAgICAqIEBwYXJhbSBfZmFyIFRoZSBmYXIgY2xpcHNwYWNlIGJvcmRlciBvbiB0aGUgei1heGlzLlxuICAgICAqIEBwYXJhbSBfZGlyZWN0aW9uIFRoZSBwbGFuZSBvbiB3aGljaCB0aGUgZmllbGRPZlZpZXctQW5nbGUgaXMgZ2l2ZW4gXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBQUk9KRUNUSU9OX0NFTlRSQUwoX2FzcGVjdDogbnVtYmVyLCBfZmllbGRPZlZpZXdJbkRlZ3JlZXM6IG51bWJlciwgX25lYXI6IG51bWJlciwgX2ZhcjogbnVtYmVyLCBfZGlyZWN0aW9uOiBGSUVMRF9PRl9WSUVXKTogTWF0cml4NHg0IHtcbiAgICAgIGxldCBmaWVsZE9mVmlld0luUmFkaWFuczogbnVtYmVyID0gX2ZpZWxkT2ZWaWV3SW5EZWdyZWVzICogTWF0aC5QSSAvIDE4MDtcbiAgICAgIGxldCBmOiBudW1iZXIgPSBNYXRoLnRhbigwLjUgKiAoTWF0aC5QSSAtIGZpZWxkT2ZWaWV3SW5SYWRpYW5zKSk7XG4gICAgICBsZXQgcmFuZ2VJbnY6IG51bWJlciA9IDEuMCAvIChfbmVhciAtIF9mYXIpO1xuICAgICAgLy8gY29uc3QgbWF0cml4OiBNYXRyaXg0eDQgPSBuZXcgTWF0cml4NHg0O1xuICAgICAgY29uc3QgbWF0cml4OiBNYXRyaXg0eDQgPSBSZWN5Y2xlci5nZXQoTWF0cml4NHg0KTtcbiAgICAgIG1hdHJpeC5kYXRhLnNldChbXG4gICAgICAgIGYsIDAsIDAsIDAsXG4gICAgICAgIDAsIGYsIDAsIDAsXG4gICAgICAgIDAsIDAsIChfbmVhciArIF9mYXIpICogcmFuZ2VJbnYsIC0xLFxuICAgICAgICAwLCAwLCBfbmVhciAqIF9mYXIgKiByYW5nZUludiAqIDIsIDBcbiAgICAgIF0pO1xuXG4gICAgICBpZiAoX2RpcmVjdGlvbiA9PSBGSUVMRF9PRl9WSUVXLkRJQUdPTkFMKSB7XG4gICAgICAgIF9hc3BlY3QgPSBNYXRoLnNxcnQoX2FzcGVjdCk7XG4gICAgICAgIG1hdHJpeC5kYXRhWzBdID0gZiAvIF9hc3BlY3Q7XG4gICAgICAgIG1hdHJpeC5kYXRhWzVdID0gZiAqIF9hc3BlY3Q7XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChfZGlyZWN0aW9uID09IEZJRUxEX09GX1ZJRVcuVkVSVElDQUwpXG4gICAgICAgIG1hdHJpeC5kYXRhWzBdID0gZiAvIF9hc3BlY3Q7XG4gICAgICBlbHNlIC8vRk9WX0RJUkVDVElPTi5IT1JJWk9OVEFMXG4gICAgICAgIG1hdHJpeC5kYXRhWzVdID0gZiAqIF9hc3BlY3Q7XG5cbiAgICAgIHJldHVybiBtYXRyaXg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29tcHV0ZXMgYW5kIHJldHVybnMgYSBtYXRyaXggdGhhdCBhcHBsaWVzIG9ydGhvZ3JhcGhpYyBwcm9qZWN0aW9uIHRvIGFuIG9iamVjdCwgaWYgaXRzIHRyYW5zZm9ybSBpcyBtdWx0aXBsaWVkIGJ5IGl0LlxuICAgICAqIEBwYXJhbSBfbGVmdCBUaGUgcG9zaXRpb252YWx1ZSBvZiB0aGUgcHJvamVjdGlvbnNwYWNlJ3MgbGVmdCBib3JkZXIuXG4gICAgICogQHBhcmFtIF9yaWdodCBUaGUgcG9zaXRpb252YWx1ZSBvZiB0aGUgcHJvamVjdGlvbnNwYWNlJ3MgcmlnaHQgYm9yZGVyLlxuICAgICAqIEBwYXJhbSBfYm90dG9tIFRoZSBwb3NpdGlvbnZhbHVlIG9mIHRoZSBwcm9qZWN0aW9uc3BhY2UncyBib3R0b20gYm9yZGVyLlxuICAgICAqIEBwYXJhbSBfdG9wIFRoZSBwb3NpdGlvbnZhbHVlIG9mIHRoZSBwcm9qZWN0aW9uc3BhY2UncyB0b3AgYm9yZGVyLlxuICAgICAqIEBwYXJhbSBfbmVhciBUaGUgcG9zaXRpb252YWx1ZSBvZiB0aGUgcHJvamVjdGlvbnNwYWNlJ3MgbmVhciBib3JkZXIuXG4gICAgICogQHBhcmFtIF9mYXIgVGhlIHBvc2l0aW9udmFsdWUgb2YgdGhlIHByb2plY3Rpb25zcGFjZSdzIGZhciBib3JkZXJcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIFBST0pFQ1RJT05fT1JUSE9HUkFQSElDKF9sZWZ0OiBudW1iZXIsIF9yaWdodDogbnVtYmVyLCBfYm90dG9tOiBudW1iZXIsIF90b3A6IG51bWJlciwgX25lYXI6IG51bWJlciA9IC00MDAsIF9mYXI6IG51bWJlciA9IDQwMCk6IE1hdHJpeDR4NCB7XG4gICAgICAvLyBjb25zdCBtYXRyaXg6IE1hdHJpeDR4NCA9IG5ldyBNYXRyaXg0eDQ7XG4gICAgICBjb25zdCBtYXRyaXg6IE1hdHJpeDR4NCA9IFJlY3ljbGVyLmdldChNYXRyaXg0eDQpO1xuICAgICAgbWF0cml4LmRhdGEuc2V0KFtcbiAgICAgICAgMiAvIChfcmlnaHQgLSBfbGVmdCksIDAsIDAsIDAsXG4gICAgICAgIDAsIDIgLyAoX3RvcCAtIF9ib3R0b20pLCAwLCAwLFxuICAgICAgICAwLCAwLCAyIC8gKF9uZWFyIC0gX2ZhciksIDAsXG4gICAgICAgIChfbGVmdCArIF9yaWdodCkgLyAoX2xlZnQgLSBfcmlnaHQpLFxuICAgICAgICAoX2JvdHRvbSArIF90b3ApIC8gKF9ib3R0b20gLSBfdG9wKSxcbiAgICAgICAgKF9uZWFyICsgX2ZhcikgLyAoX25lYXIgLSBfZmFyKSxcbiAgICAgICAgMVxuICAgICAgXSk7XG4gICAgICByZXR1cm4gbWF0cml4O1xuICAgIH1cbiAgICAvLyNlbmRyZWdpb25cblxuICAgIC8vI3JlZ2lvbiBSb3RhdGlvblxuICAgIC8qKlxuICAgICAqIFJvdGF0ZSB0aGlzIG1hdHJpeCBieSBnaXZlbiB2ZWN0b3IgaW4gdGhlIG9yZGVyIFosIFksIFguIFJpZ2h0IGhhbmQgcm90YXRpb24gaXMgdXNlZCwgdGh1bWIgcG9pbnRzIGluIGF4aXMgZGlyZWN0aW9uLCBmaW5nZXJzIGN1cmxpbmcgaW5kaWNhdGUgcm90YXRpb25cbiAgICAgKiBAcGFyYW0gX2J5IFxuICAgICAqL1xuICAgIHB1YmxpYyByb3RhdGUoX2J5OiBWZWN0b3IzKTogdm9pZCB7XG4gICAgICB0aGlzLnJvdGF0ZVooX2J5LnopO1xuICAgICAgdGhpcy5yb3RhdGVZKF9ieS55KTtcbiAgICAgIHRoaXMucm90YXRlWChfYnkueCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQWRkcyBhIHJvdGF0aW9uIGFyb3VuZCB0aGUgeC1BeGlzIHRvIHRoaXMgbWF0cml4XG4gICAgICovXG4gICAgcHVibGljIHJvdGF0ZVgoX2FuZ2xlSW5EZWdyZWVzOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgIGNvbnN0IG1hdHJpeDogTWF0cml4NHg0ID0gTWF0cml4NHg0Lk1VTFRJUExJQ0FUSU9OKHRoaXMsIE1hdHJpeDR4NC5ST1RBVElPTl9YKF9hbmdsZUluRGVncmVlcykpO1xuICAgICAgdGhpcy5zZXQobWF0cml4KTtcbiAgICAgIFJlY3ljbGVyLnN0b3JlKG1hdHJpeCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQWRkcyBhIHJvdGF0aW9uIGFyb3VuZCB0aGUgeS1BeGlzIHRvIHRoaXMgbWF0cml4XG4gICAgICovXG4gICAgcHVibGljIHJvdGF0ZVkoX2FuZ2xlSW5EZWdyZWVzOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgIGNvbnN0IG1hdHJpeDogTWF0cml4NHg0ID0gTWF0cml4NHg0Lk1VTFRJUExJQ0FUSU9OKHRoaXMsIE1hdHJpeDR4NC5ST1RBVElPTl9ZKF9hbmdsZUluRGVncmVlcykpO1xuICAgICAgdGhpcy5zZXQobWF0cml4KTtcbiAgICAgIFJlY3ljbGVyLnN0b3JlKG1hdHJpeCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQWRkcyBhIHJvdGF0aW9uIGFyb3VuZCB0aGUgei1BeGlzIHRvIHRoaXMgbWF0cml4XG4gICAgICovXG4gICAgcHVibGljIHJvdGF0ZVooX2FuZ2xlSW5EZWdyZWVzOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgIGNvbnN0IG1hdHJpeDogTWF0cml4NHg0ID0gTWF0cml4NHg0Lk1VTFRJUExJQ0FUSU9OKHRoaXMsIE1hdHJpeDR4NC5ST1RBVElPTl9aKF9hbmdsZUluRGVncmVlcykpO1xuICAgICAgdGhpcy5zZXQobWF0cml4KTtcbiAgICAgIFJlY3ljbGVyLnN0b3JlKG1hdHJpeCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQWRqdXN0cyB0aGUgcm90YXRpb24gb2YgdGhpcyBtYXRyaXggdG8gZmFjZSB0aGUgZ2l2ZW4gdGFyZ2V0IGFuZCB0aWx0cyBpdCB0byBhY2NvcmQgd2l0aCB0aGUgZ2l2ZW4gdXAgdmVjdG9yIFxuICAgICAqL1xuICAgIHB1YmxpYyBsb29rQXQoX3RhcmdldDogVmVjdG9yMywgX3VwOiBWZWN0b3IzID0gVmVjdG9yMy5ZKCkpOiB2b2lkIHtcbiAgICAgIGNvbnN0IG1hdHJpeDogTWF0cml4NHg0ID0gTWF0cml4NHg0LkxPT0tfQVQodGhpcy50cmFuc2xhdGlvbiwgX3RhcmdldCk7IC8vIFRPRE86IEhhbmRsZSByb3RhdGlvbiBhcm91bmQgei1heGlzXG4gICAgICB0aGlzLnNldChtYXRyaXgpO1xuICAgICAgUmVjeWNsZXIuc3RvcmUobWF0cml4KTtcbiAgICB9XG4gICAgLy8jZW5kcmVnaW9uXG5cbiAgICAvLyNyZWdpb24gVHJhbnNsYXRpb25cbiAgICAvKipcbiAgICAgKiBBZGQgYSB0cmFuc2xhdGlvbiBieSB0aGUgZ2l2ZW4gdmVjdG9yIHRvIHRoaXMgbWF0cml4IFxuICAgICAqL1xuICAgIHB1YmxpYyB0cmFuc2xhdGUoX2J5OiBWZWN0b3IzKTogdm9pZCB7XG4gICAgICBjb25zdCBtYXRyaXg6IE1hdHJpeDR4NCA9IE1hdHJpeDR4NC5NVUxUSVBMSUNBVElPTih0aGlzLCBNYXRyaXg0eDQuVFJBTlNMQVRJT04oX2J5KSk7XG4gICAgICAvLyBUT0RPOiBwb3NzaWJsZSBvcHRpbWl6YXRpb24sIHRyYW5zbGF0aW9uIG1heSBhbHRlciBtdXRhdG9yIGluc3RlYWQgb2YgZGVsZXRpbmcgaXQuXG4gICAgICB0aGlzLnNldChtYXRyaXgpO1xuICAgICAgUmVjeWNsZXIuc3RvcmUobWF0cml4KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBZGQgYSB0cmFuc2xhdGlvbiBhbG9uZyB0aGUgeC1BeGlzIGJ5IHRoZSBnaXZlbiBhbW91bnQgdG8gdGhpcyBtYXRyaXggXG4gICAgICovXG4gICAgcHVibGljIHRyYW5zbGF0ZVgoX3g6IG51bWJlcik6IHZvaWQge1xuICAgICAgdGhpcy5kYXRhWzEyXSArPSBfeDtcbiAgICAgIHRoaXMubXV0YXRvciA9IG51bGw7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEFkZCBhIHRyYW5zbGF0aW9uIGFsb25nIHRoZSB5LUF4aXMgYnkgdGhlIGdpdmVuIGFtb3VudCB0byB0aGlzIG1hdHJpeCBcbiAgICAgKi9cbiAgICBwdWJsaWMgdHJhbnNsYXRlWShfeTogbnVtYmVyKTogdm9pZCB7XG4gICAgICB0aGlzLmRhdGFbMTNdICs9IF95O1xuICAgICAgdGhpcy5tdXRhdG9yID0gbnVsbDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQWRkIGEgdHJhbnNsYXRpb24gYWxvbmcgdGhlIHktQXhpcyBieSB0aGUgZ2l2ZW4gYW1vdW50IHRvIHRoaXMgbWF0cml4IFxuICAgICAqL1xuICAgIHB1YmxpYyB0cmFuc2xhdGVaKF96OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgIHRoaXMuZGF0YVsxNF0gKz0gX3o7XG4gICAgICB0aGlzLm11dGF0b3IgPSBudWxsO1xuICAgIH1cbiAgICAvLyNlbmRyZWdpb25cblxuICAgIC8vI3JlZ2lvbiBTY2FsaW5nXG4gICAgLyoqXG4gICAgICogQWRkIGEgc2NhbGluZyBieSB0aGUgZ2l2ZW4gdmVjdG9yIHRvIHRoaXMgbWF0cml4IFxuICAgICAqL1xuICAgIHB1YmxpYyBzY2FsZShfYnk6IFZlY3RvcjMpOiB2b2lkIHtcbiAgICAgIGNvbnN0IG1hdHJpeDogTWF0cml4NHg0ID0gTWF0cml4NHg0Lk1VTFRJUExJQ0FUSU9OKHRoaXMsIE1hdHJpeDR4NC5TQ0FMSU5HKF9ieSkpO1xuICAgICAgdGhpcy5zZXQobWF0cml4KTtcbiAgICAgIFJlY3ljbGVyLnN0b3JlKG1hdHJpeCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEFkZCBhIHNjYWxpbmcgYWxvbmcgdGhlIHgtQXhpcyBieSB0aGUgZ2l2ZW4gYW1vdW50IHRvIHRoaXMgbWF0cml4IFxuICAgICAqL1xuICAgIHB1YmxpYyBzY2FsZVgoX2J5OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgIHRoaXMuc2NhbGUobmV3IFZlY3RvcjMoX2J5LCAxLCAxKSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEFkZCBhIHNjYWxpbmcgYWxvbmcgdGhlIHktQXhpcyBieSB0aGUgZ2l2ZW4gYW1vdW50IHRvIHRoaXMgbWF0cml4IFxuICAgICAqL1xuICAgIHB1YmxpYyBzY2FsZVkoX2J5OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgIHRoaXMuc2NhbGUobmV3IFZlY3RvcjMoMSwgX2J5LCAxKSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEFkZCBhIHNjYWxpbmcgYWxvbmcgdGhlIHotQXhpcyBieSB0aGUgZ2l2ZW4gYW1vdW50IHRvIHRoaXMgbWF0cml4IFxuICAgICAqL1xuICAgIHB1YmxpYyBzY2FsZVooX2J5OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgIHRoaXMuc2NhbGUobmV3IFZlY3RvcjMoMSwgMSwgX2J5KSk7XG4gICAgfVxuICAgIC8vI2VuZHJlZ2lvblxuXG4gICAgLy8jcmVnaW9uIFRyYW5zZm9ybWF0aW9uXG4gICAgLyoqXG4gICAgICogTXVsdGlwbHkgdGhpcyBtYXRyaXggd2l0aCB0aGUgZ2l2ZW4gbWF0cml4XG4gICAgICovXG4gICAgcHVibGljIG11bHRpcGx5KF9tYXRyaXg6IE1hdHJpeDR4NCk6IHZvaWQge1xuICAgICAgdGhpcy5zZXQoTWF0cml4NHg0Lk1VTFRJUExJQ0FUSU9OKHRoaXMsIF9tYXRyaXgpKTtcbiAgICAgIHRoaXMubXV0YXRvciA9IG51bGw7XG4gICAgfVxuICAgIC8vI2VuZHJlZ2lvblxuXG4gICAgLy8jcmVnaW9uIFRyYW5zZmVyXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyBhbmQgcmV0dXJucyB0aGUgZXVsZXItYW5nbGVzIHJlcHJlc2VudGluZyB0aGUgY3VycmVudCByb3RhdGlvbiBvZiB0aGlzIG1hdHJpeFxuICAgICAqL1xuICAgIHB1YmxpYyBnZXRFdWxlckFuZ2xlcygpOiBWZWN0b3IzIHtcbiAgICAgIGxldCBzY2FsaW5nOiBWZWN0b3IzID0gdGhpcy5zY2FsaW5nO1xuXG4gICAgICBsZXQgczA6IG51bWJlciA9IHRoaXMuZGF0YVswXSAvIHNjYWxpbmcueDtcbiAgICAgIGxldCBzMTogbnVtYmVyID0gdGhpcy5kYXRhWzFdIC8gc2NhbGluZy54O1xuICAgICAgbGV0IHMyOiBudW1iZXIgPSB0aGlzLmRhdGFbMl0gLyBzY2FsaW5nLng7XG4gICAgICBsZXQgczY6IG51bWJlciA9IHRoaXMuZGF0YVs2XSAvIHNjYWxpbmcueTtcbiAgICAgIGxldCBzMTA6IG51bWJlciA9IHRoaXMuZGF0YVsxMF0gLyBzY2FsaW5nLno7XG5cbiAgICAgIGxldCBzeTogbnVtYmVyID0gTWF0aC5oeXBvdChzMCwgczEpOyAvLyBwcm9iYWJseSAyLiBwYXJhbSBzaG91bGQgYmUgdGhpcy5kYXRhWzRdIC8gc2NhbGluZy55XG5cbiAgICAgIGxldCBzaW5ndWxhcjogYm9vbGVhbiA9IHN5IDwgMWUtNjsgLy8gSWZcblxuICAgICAgbGV0IHgxOiBudW1iZXIsIHkxOiBudW1iZXIsIHoxOiBudW1iZXI7XG4gICAgICBsZXQgeDI6IG51bWJlciwgeTI6IG51bWJlciwgejI6IG51bWJlcjtcblxuICAgICAgaWYgKCFzaW5ndWxhcikge1xuICAgICAgICB4MSA9IE1hdGguYXRhbjIoczYsIHMxMCk7XG4gICAgICAgIHkxID0gTWF0aC5hdGFuMigtczIsIHN5KTtcbiAgICAgICAgejEgPSBNYXRoLmF0YW4yKHMxLCBzMCk7XG5cbiAgICAgICAgeDIgPSBNYXRoLmF0YW4yKC1zNiwgLXMxMCk7XG4gICAgICAgIHkyID0gTWF0aC5hdGFuMigtczIsIC1zeSk7XG4gICAgICAgIHoyID0gTWF0aC5hdGFuMigtczEsIC1zMCk7XG5cbiAgICAgICAgaWYgKE1hdGguYWJzKHgyKSArIE1hdGguYWJzKHkyKSArIE1hdGguYWJzKHoyKSA8IE1hdGguYWJzKHgxKSArIE1hdGguYWJzKHkxKSArIE1hdGguYWJzKHoxKSkge1xuICAgICAgICAgIHgxID0geDI7XG4gICAgICAgICAgeTEgPSB5MjtcbiAgICAgICAgICB6MSA9IHoyO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgeDEgPSBNYXRoLmF0YW4yKC10aGlzLmRhdGFbOV0gLyBzY2FsaW5nLnosIHRoaXMuZGF0YVs1XSAvIHNjYWxpbmcueSk7XG4gICAgICAgIHkxID0gTWF0aC5hdGFuMigtdGhpcy5kYXRhWzJdIC8gc2NhbGluZy54LCBzeSk7XG4gICAgICAgIHoxID0gMDtcbiAgICAgIH1cblxuICAgICAgbGV0IHJvdGF0aW9uOiBWZWN0b3IzID0gbmV3IFZlY3RvcjMoeDEsIHkxLCB6MSk7XG4gICAgICByb3RhdGlvbi5zY2FsZSgxODAgLyBNYXRoLlBJKTtcblxuICAgICAgcmV0dXJuIHJvdGF0aW9uO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNldHMgdGhlIGVsZW1lbnRzIG9mIHRoaXMgbWF0cml4IHRvIHRoZSB2YWx1ZXMgb2YgdGhlIGdpdmVuIG1hdHJpeFxuICAgICAqL1xuICAgIHB1YmxpYyBzZXQoX3RvOiBNYXRyaXg0eDQpOiB2b2lkIHtcbiAgICAgIC8vIHRoaXMuZGF0YSA9IF90by5nZXQoKTtcbiAgICAgIHRoaXMuZGF0YS5zZXQoX3RvLmRhdGEpO1xuICAgICAgdGhpcy5yZXNldENhY2hlKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJuIHRoZSBlbGVtZW50cyBvZiB0aGlzIG1hdHJpeCBhcyBhIEZsb2F0MzJBcnJheVxuICAgICAqL1xuICAgIHB1YmxpYyBnZXQoKTogRmxvYXQzMkFycmF5IHtcbiAgICAgIHJldHVybiBuZXcgRmxvYXQzMkFycmF5KHRoaXMuZGF0YSk7XG4gICAgfVxuXG4gICAgcHVibGljIHNlcmlhbGl6ZSgpOiBTZXJpYWxpemF0aW9uIHtcbiAgICAgIC8vIFRPRE86IHNhdmUgdHJhbnNsYXRpb24sIHJvdGF0aW9uIGFuZCBzY2FsZSBhcyB2ZWN0b3JzIGZvciByZWFkYWJpbGl0eSBhbmQgbWFuaXB1bGF0aW9uXG4gICAgICBsZXQgc2VyaWFsaXphdGlvbjogU2VyaWFsaXphdGlvbiA9IHRoaXMuZ2V0TXV0YXRvcigpO1xuICAgICAgcmV0dXJuIHNlcmlhbGl6YXRpb247XG4gICAgfVxuICAgIHB1YmxpYyBkZXNlcmlhbGl6ZShfc2VyaWFsaXphdGlvbjogU2VyaWFsaXphdGlvbik6IFNlcmlhbGl6YWJsZSB7XG4gICAgICB0aGlzLm11dGF0ZShfc2VyaWFsaXphdGlvbik7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0TXV0YXRvcigpOiBNdXRhdG9yIHtcbiAgICAgIGlmICh0aGlzLm11dGF0b3IpXG4gICAgICAgIHJldHVybiB0aGlzLm11dGF0b3I7XG5cbiAgICAgIGxldCBtdXRhdG9yOiBNdXRhdG9yID0ge1xuICAgICAgICB0cmFuc2xhdGlvbjogdGhpcy50cmFuc2xhdGlvbi5nZXRNdXRhdG9yKCksXG4gICAgICAgIHJvdGF0aW9uOiB0aGlzLnJvdGF0aW9uLmdldE11dGF0b3IoKSxcbiAgICAgICAgc2NhbGluZzogdGhpcy5zY2FsaW5nLmdldE11dGF0b3IoKVxuICAgICAgfTtcblxuICAgICAgLy8gY2FjaGUgbXV0YXRvclxuICAgICAgdGhpcy5tdXRhdG9yID0gbXV0YXRvcjtcbiAgICAgIHJldHVybiBtdXRhdG9yO1xuICAgIH1cblxuICAgIHB1YmxpYyBtdXRhdGUoX211dGF0b3I6IE11dGF0b3IpOiB2b2lkIHtcbiAgICAgIGxldCBvbGRUcmFuc2xhdGlvbjogVmVjdG9yMyA9IHRoaXMudHJhbnNsYXRpb247XG4gICAgICBsZXQgb2xkUm90YXRpb246IFZlY3RvcjMgPSB0aGlzLnJvdGF0aW9uO1xuICAgICAgbGV0IG9sZFNjYWxpbmc6IFZlY3RvcjMgPSB0aGlzLnNjYWxpbmc7XG4gICAgICBsZXQgbmV3VHJhbnNsYXRpb246IFZlY3RvcjMgPSA8VmVjdG9yMz5fbXV0YXRvcltcInRyYW5zbGF0aW9uXCJdO1xuICAgICAgbGV0IG5ld1JvdGF0aW9uOiBWZWN0b3IzID0gPFZlY3RvcjM+X211dGF0b3JbXCJyb3RhdGlvblwiXTtcbiAgICAgIGxldCBuZXdTY2FsaW5nOiBWZWN0b3IzID0gPFZlY3RvcjM+X211dGF0b3JbXCJzY2FsaW5nXCJdO1xuICAgICAgbGV0IHZlY3RvcnM6IFZlY3RvclJlcHJlc2VudGF0aW9uID0geyB0cmFuc2xhdGlvbjogb2xkVHJhbnNsYXRpb24sIHJvdGF0aW9uOiBvbGRSb3RhdGlvbiwgc2NhbGluZzogb2xkU2NhbGluZyB9O1xuICAgICAgaWYgKG5ld1RyYW5zbGF0aW9uKSB7XG4gICAgICAgIHZlY3RvcnMudHJhbnNsYXRpb24gPSBuZXcgVmVjdG9yMyhcbiAgICAgICAgICBuZXdUcmFuc2xhdGlvbi54ICE9IHVuZGVmaW5lZCA/IG5ld1RyYW5zbGF0aW9uLnggOiBvbGRUcmFuc2xhdGlvbi54LFxuICAgICAgICAgIG5ld1RyYW5zbGF0aW9uLnkgIT0gdW5kZWZpbmVkID8gbmV3VHJhbnNsYXRpb24ueSA6IG9sZFRyYW5zbGF0aW9uLnksXG4gICAgICAgICAgbmV3VHJhbnNsYXRpb24ueiAhPSB1bmRlZmluZWQgPyBuZXdUcmFuc2xhdGlvbi56IDogb2xkVHJhbnNsYXRpb24uelxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgaWYgKG5ld1JvdGF0aW9uKSB7XG4gICAgICAgIHZlY3RvcnMucm90YXRpb24gPSBuZXcgVmVjdG9yMyhcbiAgICAgICAgICBuZXdSb3RhdGlvbi54ICE9IHVuZGVmaW5lZCA/IG5ld1JvdGF0aW9uLnggOiBvbGRSb3RhdGlvbi54LFxuICAgICAgICAgIG5ld1JvdGF0aW9uLnkgIT0gdW5kZWZpbmVkID8gbmV3Um90YXRpb24ueSA6IG9sZFJvdGF0aW9uLnksXG4gICAgICAgICAgbmV3Um90YXRpb24ueiAhPSB1bmRlZmluZWQgPyBuZXdSb3RhdGlvbi56IDogb2xkUm90YXRpb24uelxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgaWYgKG5ld1NjYWxpbmcpIHtcbiAgICAgICAgdmVjdG9ycy5zY2FsaW5nID0gbmV3IFZlY3RvcjMoXG4gICAgICAgICAgbmV3U2NhbGluZy54ICE9IHVuZGVmaW5lZCA/IG5ld1NjYWxpbmcueCA6IG9sZFNjYWxpbmcueCxcbiAgICAgICAgICBuZXdTY2FsaW5nLnkgIT0gdW5kZWZpbmVkID8gbmV3U2NhbGluZy55IDogb2xkU2NhbGluZy55LFxuICAgICAgICAgIG5ld1NjYWxpbmcueiAhPSB1bmRlZmluZWQgPyBuZXdTY2FsaW5nLnogOiBvbGRTY2FsaW5nLnpcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgLy8gVE9ETzogcG9zc2libGUgcGVyZm9ybWFuY2Ugb3B0aW1pemF0aW9uIHdoZW4gb25seSBvbmUgb3IgdHdvIGNvbXBvbmVudHMgY2hhbmdlLCB0aGVuIHVzZSBvbGQgbWF0cml4IGluc3RlYWQgb2YgSURFTlRJVFkgYW5kIHRyYW5zZm9ybSBieSBkaWZmZXJlbmNlcy9xdW90aWVudHNcbiAgICAgIGxldCBtYXRyaXg6IE1hdHJpeDR4NCA9IE1hdHJpeDR4NC5JREVOVElUWTtcbiAgICAgIGlmICh2ZWN0b3JzLnRyYW5zbGF0aW9uKVxuICAgICAgICBtYXRyaXgudHJhbnNsYXRlKHZlY3RvcnMudHJhbnNsYXRpb24pO1xuICAgICAgaWYgKHZlY3RvcnMucm90YXRpb24pIHtcbiAgICAgICAgbWF0cml4LnJvdGF0ZVoodmVjdG9ycy5yb3RhdGlvbi56KTtcbiAgICAgICAgbWF0cml4LnJvdGF0ZVkodmVjdG9ycy5yb3RhdGlvbi55KTtcbiAgICAgICAgbWF0cml4LnJvdGF0ZVgodmVjdG9ycy5yb3RhdGlvbi54KTtcbiAgICAgIH1cbiAgICAgIGlmICh2ZWN0b3JzLnNjYWxpbmcpXG4gICAgICAgIG1hdHJpeC5zY2FsZSh2ZWN0b3JzLnNjYWxpbmcpO1xuICAgICAgdGhpcy5zZXQobWF0cml4KTtcblxuICAgICAgdGhpcy52ZWN0b3JzID0gdmVjdG9ycztcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0TXV0YXRvckF0dHJpYnV0ZVR5cGVzKF9tdXRhdG9yOiBNdXRhdG9yKTogTXV0YXRvckF0dHJpYnV0ZVR5cGVzIHtcbiAgICAgIGxldCB0eXBlczogTXV0YXRvckF0dHJpYnV0ZVR5cGVzID0ge307XG4gICAgICBpZiAoX211dGF0b3IudHJhbnNsYXRpb24pIHR5cGVzLnRyYW5zbGF0aW9uID0gXCJWZWN0b3IzXCI7XG4gICAgICBpZiAoX211dGF0b3Iucm90YXRpb24pIHR5cGVzLnJvdGF0aW9uID0gXCJWZWN0b3IzXCI7XG4gICAgICBpZiAoX211dGF0b3Iuc2NhbGluZykgdHlwZXMuc2NhbGluZyA9IFwiVmVjdG9yM1wiO1xuICAgICAgcmV0dXJuIHR5cGVzO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgcmVkdWNlTXV0YXRvcihfbXV0YXRvcjogTXV0YXRvcik6IHZvaWQgey8qKiAqLyB9XG5cbiAgICBwcml2YXRlIHJlc2V0Q2FjaGUoKTogdm9pZCB7XG4gICAgICB0aGlzLnZlY3RvcnMgPSB7IHRyYW5zbGF0aW9uOiBudWxsLCByb3RhdGlvbjogbnVsbCwgc2NhbGluZzogbnVsbCB9O1xuICAgICAgdGhpcy5tdXRhdG9yID0gbnVsbDtcbiAgICB9XG4gIH1cbiAgLy8jZW5kcmVnaW9uXG59XG4iLCJuYW1lc3BhY2UgRnVkZ2VDb3JlIHtcbiAgICAvKipcbiAgICAgKiBEZWZpbmVzIHRoZSBvcmlnaW4gb2YgYSByZWN0YW5nbGVcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBPUklHSU4yRCB7XG4gICAgICAgIFRPUExFRlQgPSAweDAwLFxuICAgICAgICBUT1BDRU5URVIgPSAweDAxLFxuICAgICAgICBUT1BSSUdIVCA9IDB4MDIsXG4gICAgICAgIENFTlRFUkxFRlQgPSAweDEwLFxuICAgICAgICBDRU5URVIgPSAweDExLFxuICAgICAgICBDRU5URVJSSUdIVCA9IDB4MTIsXG4gICAgICAgIEJPVFRPTUxFRlQgPSAweDIwLFxuICAgICAgICBCT1RUT01DRU5URVIgPSAweDIxLFxuICAgICAgICBCT1RUT01SSUdIVCA9IDB4MjJcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBEZWZpbmVzIGEgcmVjdGFuZ2xlIHdpdGggcG9zaXRpb24gYW5kIHNpemUgYW5kIGFkZCBjb21mb3J0YWJsZSBtZXRob2RzIHRvIGl0XG4gICAgICogQGF1dGhvciBKaXJrYSBEZWxsJ09yby1GcmllZGwsIEhGVSwgMjAxOVxuICAgICAqL1xuICAgIGV4cG9ydCBjbGFzcyBSZWN0YW5nbGUgZXh0ZW5kcyBNdXRhYmxlIHtcbiAgICAgICAgcHVibGljIHBvc2l0aW9uOiBWZWN0b3IyID0gUmVjeWNsZXIuZ2V0KFZlY3RvcjIpO1xuICAgICAgICBwdWJsaWMgc2l6ZTogVmVjdG9yMiA9IFJlY3ljbGVyLmdldChWZWN0b3IyKTtcblxuICAgICAgICBjb25zdHJ1Y3RvcihfeDogbnVtYmVyID0gMCwgX3k6IG51bWJlciA9IDAsIF93aWR0aDogbnVtYmVyID0gMSwgX2hlaWdodDogbnVtYmVyID0gMSwgX29yaWdpbjogT1JJR0lOMkQgPSBPUklHSU4yRC5UT1BMRUZUKSB7XG4gICAgICAgICAgICBzdXBlcigpO1xuICAgICAgICAgICAgdGhpcy5zZXRQb3NpdGlvbkFuZFNpemUoX3gsIF95LCBfd2lkdGgsIF9oZWlnaHQsIF9vcmlnaW4pO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJldHVybnMgYSBuZXcgcmVjdGFuZ2xlIGNyZWF0ZWQgd2l0aCB0aGUgZ2l2ZW4gcGFyYW1ldGVyc1xuICAgICAgICAgKi9cbiAgICAgICAgcHVibGljIHN0YXRpYyBHRVQoX3g6IG51bWJlciA9IDAsIF95OiBudW1iZXIgPSAwLCBfd2lkdGg6IG51bWJlciA9IDEsIF9oZWlnaHQ6IG51bWJlciA9IDEsIF9vcmlnaW46IE9SSUdJTjJEID0gT1JJR0lOMkQuVE9QTEVGVCk6IFJlY3RhbmdsZSB7XG4gICAgICAgICAgICBsZXQgcmVjdDogUmVjdGFuZ2xlID0gUmVjeWNsZXIuZ2V0KFJlY3RhbmdsZSk7XG4gICAgICAgICAgICByZWN0LnNldFBvc2l0aW9uQW5kU2l6ZShfeCwgX3ksIF93aWR0aCwgX2hlaWdodCk7XG4gICAgICAgICAgICByZXR1cm4gcmVjdDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTZXRzIHRoZSBwb3NpdGlvbiBhbmQgc2l6ZSBvZiB0aGUgcmVjdGFuZ2xlIGFjY29yZGluZyB0byB0aGUgZ2l2ZW4gcGFyYW1ldGVyc1xuICAgICAgICAgKi9cbiAgICAgICAgcHVibGljIHNldFBvc2l0aW9uQW5kU2l6ZShfeDogbnVtYmVyID0gMCwgX3k6IG51bWJlciA9IDAsIF93aWR0aDogbnVtYmVyID0gMSwgX2hlaWdodDogbnVtYmVyID0gMSwgX29yaWdpbjogT1JJR0lOMkQgPSBPUklHSU4yRC5UT1BMRUZUKTogdm9pZCB7XG4gICAgICAgICAgICB0aGlzLnNpemUuc2V0KF93aWR0aCwgX2hlaWdodCk7XG4gICAgICAgICAgICBzd2l0Y2ggKF9vcmlnaW4gJiAweDAzKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAweDAwOiB0aGlzLnBvc2l0aW9uLnggPSBfeDsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAweDAxOiB0aGlzLnBvc2l0aW9uLnggPSBfeCAtIF93aWR0aCAvIDI7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMHgwMjogdGhpcy5wb3NpdGlvbi54ID0gX3ggLSBfd2lkdGg7IGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3dpdGNoIChfb3JpZ2luICYgMHgzMCkge1xuICAgICAgICAgICAgICAgIGNhc2UgMHgwMDogdGhpcy5wb3NpdGlvbi55ID0gX3k7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMHgxMDogdGhpcy5wb3NpdGlvbi55ID0gX3kgLSBfaGVpZ2h0IC8gMjsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAweDIwOiB0aGlzLnBvc2l0aW9uLnkgPSBfeSAtIF9oZWlnaHQ7IGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZ2V0IHgoKTogbnVtYmVyIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBvc2l0aW9uLng7XG4gICAgICAgIH1cbiAgICAgICAgZ2V0IHkoKTogbnVtYmVyIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBvc2l0aW9uLnk7XG4gICAgICAgIH1cbiAgICAgICAgZ2V0IHdpZHRoKCk6IG51bWJlciB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zaXplLng7XG4gICAgICAgIH1cbiAgICAgICAgZ2V0IGhlaWdodCgpOiBudW1iZXIge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2l6ZS55O1xuICAgICAgICB9XG5cbiAgICAgICAgZ2V0IGxlZnQoKTogbnVtYmVyIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBvc2l0aW9uLng7XG4gICAgICAgIH1cbiAgICAgICAgZ2V0IHRvcCgpOiBudW1iZXIge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucG9zaXRpb24ueTtcbiAgICAgICAgfVxuICAgICAgICBnZXQgcmlnaHQoKTogbnVtYmVyIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBvc2l0aW9uLnggKyB0aGlzLnNpemUueDtcbiAgICAgICAgfVxuICAgICAgICBnZXQgYm90dG9tKCk6IG51bWJlciB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wb3NpdGlvbi55ICsgdGhpcy5zaXplLnk7XG4gICAgICAgIH1cblxuICAgICAgICBzZXQgeChfeDogbnVtYmVyKSB7XG4gICAgICAgICAgICB0aGlzLnBvc2l0aW9uLnggPSBfeDtcbiAgICAgICAgfVxuICAgICAgICBzZXQgeShfeTogbnVtYmVyKSB7XG4gICAgICAgICAgICB0aGlzLnBvc2l0aW9uLnkgPSBfeTtcbiAgICAgICAgfVxuICAgICAgICBzZXQgd2lkdGgoX3dpZHRoOiBudW1iZXIpIHtcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb24ueCA9IF93aWR0aDtcbiAgICAgICAgfVxuICAgICAgICBzZXQgaGVpZ2h0KF9oZWlnaHQ6IG51bWJlcikge1xuICAgICAgICAgICAgdGhpcy5wb3NpdGlvbi55ID0gX2hlaWdodDtcbiAgICAgICAgfVxuICAgICAgICBzZXQgbGVmdChfdmFsdWU6IG51bWJlcikge1xuICAgICAgICAgICAgdGhpcy5zaXplLnggPSB0aGlzLnJpZ2h0IC0gX3ZhbHVlO1xuICAgICAgICAgICAgdGhpcy5wb3NpdGlvbi54ID0gX3ZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIHNldCB0b3AoX3ZhbHVlOiBudW1iZXIpIHtcbiAgICAgICAgICAgIHRoaXMuc2l6ZS55ID0gdGhpcy5ib3R0b20gLSBfdmFsdWU7XG4gICAgICAgICAgICB0aGlzLnBvc2l0aW9uLnkgPSBfdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgc2V0IHJpZ2h0KF92YWx1ZTogbnVtYmVyKSB7XG4gICAgICAgICAgICB0aGlzLnNpemUueCA9IHRoaXMucG9zaXRpb24ueCArIF92YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBzZXQgYm90dG9tKF92YWx1ZTogbnVtYmVyKSB7XG4gICAgICAgICAgICB0aGlzLnNpemUueSA9IHRoaXMucG9zaXRpb24ueSArIF92YWx1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZXR1cm5zIHRydWUgaWYgdGhlIGdpdmVuIHBvaW50IGlzIGluc2lkZSBvZiB0aGlzIHJlY3RhbmdsZSBvciBvbiB0aGUgYm9yZGVyXG4gICAgICAgICAqIEBwYXJhbSBfcG9pbnRcbiAgICAgICAgICovXG4gICAgICAgIHB1YmxpYyBpc0luc2lkZShfcG9pbnQ6IFZlY3RvcjIpOiBib29sZWFuIHtcbiAgICAgICAgICAgIHJldHVybiAoX3BvaW50LnggPj0gdGhpcy5sZWZ0ICYmIF9wb2ludC54IDw9IHRoaXMucmlnaHQgJiYgX3BvaW50LnkgPj0gdGhpcy50b3AgJiYgX3BvaW50LnkgPD0gdGhpcy5ib3R0b20pO1xuICAgICAgICB9XG5cbiAgICAgICAgcHJvdGVjdGVkIHJlZHVjZU11dGF0b3IoX211dGF0b3I6IE11dGF0b3IpOiB2b2lkIHsvKiAqLyB9XG4gICAgfVxufSIsIm5hbWVzcGFjZSBGdWRnZUNvcmUge1xuICAvKipcbiAgICogU3RvcmVzIGFuZCBtYW5pcHVsYXRlcyBhIHR3b2RpbWVuc2lvbmFsIHZlY3RvciBjb21wcmlzZWQgb2YgdGhlIGNvbXBvbmVudHMgeCBhbmQgeVxuICAgKiBgYGBwbGFpbnRleHRcbiAgICogICAgICAgICAgICAreVxuICAgKiAgICAgICAgICAgICB8X18gK3hcbiAgICogYGBgXG4gICAqIEBhdXRob3JzIEx1a2FzIFNjaGV1ZXJsZSwgSEZVLCAyMDE5XG4gICAqL1xuICBleHBvcnQgY2xhc3MgVmVjdG9yMiBleHRlbmRzIE11dGFibGUge1xuICAgIHByaXZhdGUgZGF0YTogRmxvYXQzMkFycmF5O1xuXG4gICAgcHVibGljIGNvbnN0cnVjdG9yKF94OiBudW1iZXIgPSAwLCBfeTogbnVtYmVyID0gMCkge1xuICAgICAgc3VwZXIoKTtcbiAgICAgIHRoaXMuZGF0YSA9IG5ldyBGbG9hdDMyQXJyYXkoW194LCBfeV0pO1xuICAgIH1cblxuICAgIGdldCB4KCk6IG51bWJlciB7XG4gICAgICByZXR1cm4gdGhpcy5kYXRhWzBdO1xuICAgIH1cbiAgICBnZXQgeSgpOiBudW1iZXIge1xuICAgICAgcmV0dXJuIHRoaXMuZGF0YVsxXTtcbiAgICB9XG5cbiAgICBzZXQgeChfeDogbnVtYmVyKSB7XG4gICAgICB0aGlzLmRhdGFbMF0gPSBfeDtcbiAgICB9XG4gICAgc2V0IHkoX3k6IG51bWJlcikge1xuICAgICAgdGhpcy5kYXRhWzFdID0gX3k7XG4gICAgfVxuXG4gICAgLyoqIFxuICAgICAqIEEgc2hvcnRoYW5kIGZvciB3cml0aW5nIGBuZXcgVmVjdG9yMigwLCAwKWAuXG4gICAgICogQHJldHVybnMgQSBuZXcgdmVjdG9yIHdpdGggdGhlIHZhbHVlcyAoMCwgMClcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIFpFUk8oKTogVmVjdG9yMiB7XG4gICAgICBsZXQgdmVjdG9yOiBWZWN0b3IyID0gbmV3IFZlY3RvcjIoKTtcbiAgICAgIHJldHVybiB2ZWN0b3I7XG4gICAgfVxuXG4gICAgLyoqIFxuICAgICAqIEEgc2hvcnRoYW5kIGZvciB3cml0aW5nIGBuZXcgVmVjdG9yMihfc2NhbGUsIF9zY2FsZSlgLlxuICAgICAqIEBwYXJhbSBfc2NhbGUgdGhlIHNjYWxlIG9mIHRoZSB2ZWN0b3IuIERlZmF1bHQ6IDFcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIE9ORShfc2NhbGU6IG51bWJlciA9IDEpOiBWZWN0b3IyIHtcbiAgICAgIGxldCB2ZWN0b3I6IFZlY3RvcjIgPSBuZXcgVmVjdG9yMihfc2NhbGUsIF9zY2FsZSk7XG4gICAgICByZXR1cm4gdmVjdG9yO1xuICAgIH1cblxuICAgIC8qKiBcbiAgICAgKiBBIHNob3J0aGFuZCBmb3Igd3JpdGluZyBgbmV3IFZlY3RvcjIoMCwgeSlgLlxuICAgICAqIEBwYXJhbSBfc2NhbGUgVGhlIG51bWJlciB0byB3cml0ZSBpbiB0aGUgeSBjb29yZGluYXRlLiBEZWZhdWx0OiAxXG4gICAgICogQHJldHVybnMgQSBuZXcgdmVjdG9yIHdpdGggdGhlIHZhbHVlcyAoMCwgX3NjYWxlKVxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgWShfc2NhbGU6IG51bWJlciA9IDEpOiBWZWN0b3IyIHtcbiAgICAgIGxldCB2ZWN0b3I6IFZlY3RvcjIgPSBuZXcgVmVjdG9yMigwLCBfc2NhbGUpO1xuICAgICAgcmV0dXJuIHZlY3RvcjtcbiAgICB9XG5cbiAgICAvKiogXG4gICAgICogQSBzaG9ydGhhbmQgZm9yIHdyaXRpbmcgYG5ldyBWZWN0b3IyKHgsIDApYC5cbiAgICAgKiBAcGFyYW0gX3NjYWxlIFRoZSBudW1iZXIgdG8gd3JpdGUgaW4gdGhlIHggY29vcmRpbmF0ZS4gRGVmYXVsdDogMVxuICAgICAqIEByZXR1cm5zIEEgbmV3IHZlY3RvciB3aXRoIHRoZSB2YWx1ZXMgKF9zY2FsZSwgMClcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIFgoX3NjYWxlOiBudW1iZXIgPSAxKTogVmVjdG9yMiB7XG4gICAgICBsZXQgdmVjdG9yOiBWZWN0b3IyID0gbmV3IFZlY3RvcjIoX3NjYWxlLCAwKTtcbiAgICAgIHJldHVybiB2ZWN0b3I7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBOb3JtYWxpemVzIGEgZ2l2ZW4gdmVjdG9yIHRvIHRoZSBnaXZlbiBsZW5ndGggd2l0aG91dCBlZGl0aW5nIHRoZSBvcmlnaW5hbCB2ZWN0b3IuXG4gICAgICogQHBhcmFtIF92ZWN0b3IgdGhlIHZlY3RvciB0byBub3JtYWxpemVcbiAgICAgKiBAcGFyYW0gX2xlbmd0aCB0aGUgbGVuZ3RoIG9mIHRoZSByZXN1bHRpbmcgdmVjdG9yLiBkZWZhdWx0cyB0byAxXG4gICAgICogQHJldHVybnMgYSBuZXcgdmVjdG9yIHJlcHJlc2VudGluZyB0aGUgbm9ybWFsaXNlZCB2ZWN0b3Igc2NhbGVkIGJ5IHRoZSBnaXZlbiBsZW5ndGhcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIE5PUk1BTElaQVRJT04oX3ZlY3RvcjogVmVjdG9yMiwgX2xlbmd0aDogbnVtYmVyID0gMSk6IFZlY3RvcjIge1xuICAgICAgbGV0IHZlY3RvcjogVmVjdG9yMiA9IFZlY3RvcjIuWkVSTygpO1xuICAgICAgdHJ5IHtcbiAgICAgICAgbGV0IFt4LCB5XSA9IF92ZWN0b3IuZGF0YTtcbiAgICAgICAgbGV0IGZhY3RvcjogbnVtYmVyID0gX2xlbmd0aCAvIE1hdGguaHlwb3QoeCwgeSk7XG4gICAgICAgIHZlY3Rvci5kYXRhID0gbmV3IEZsb2F0MzJBcnJheShbX3ZlY3Rvci54ICogZmFjdG9yLCBfdmVjdG9yLnkgKiBmYWN0b3JdKTtcbiAgICAgIH0gY2F0Y2ggKF9lKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihfZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdmVjdG9yO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNjYWxlcyBhIGdpdmVuIHZlY3RvciBieSBhIGdpdmVuIHNjYWxlIHdpdGhvdXQgY2hhbmdpbmcgdGhlIG9yaWdpbmFsIHZlY3RvclxuICAgICAqIEBwYXJhbSBfdmVjdG9yIFRoZSB2ZWN0b3IgdG8gc2NhbGUuXG4gICAgICogQHBhcmFtIF9zY2FsZSBUaGUgc2NhbGUgdG8gc2NhbGUgd2l0aC5cbiAgICAgKiBAcmV0dXJucyBBIG5ldyB2ZWN0b3IgcmVwcmVzZW50aW5nIHRoZSBzY2FsZWQgdmVyc2lvbiBvZiB0aGUgZ2l2ZW4gdmVjdG9yXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBTQ0FMRShfdmVjdG9yOiBWZWN0b3IyLCBfc2NhbGU6IG51bWJlcik6IFZlY3RvcjIge1xuICAgICAgbGV0IHZlY3RvcjogVmVjdG9yMiA9IG5ldyBWZWN0b3IyKCk7XG4gICAgICByZXR1cm4gdmVjdG9yO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFN1bXMgdXAgbXVsdGlwbGUgdmVjdG9ycy5cbiAgICAgKiBAcGFyYW0gX3ZlY3RvcnMgQSBzZXJpZXMgb2YgdmVjdG9ycyB0byBzdW0gdXBcbiAgICAgKiBAcmV0dXJucyBBIG5ldyB2ZWN0b3IgcmVwcmVzZW50aW5nIHRoZSBzdW0gb2YgdGhlIGdpdmVuIHZlY3RvcnNcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIFNVTSguLi5fdmVjdG9yczogVmVjdG9yMltdKTogVmVjdG9yMiB7XG4gICAgICBsZXQgcmVzdWx0OiBWZWN0b3IyID0gbmV3IFZlY3RvcjIoKTtcbiAgICAgIGZvciAobGV0IHZlY3RvciBvZiBfdmVjdG9ycylcbiAgICAgICAgcmVzdWx0LmRhdGEgPSBuZXcgRmxvYXQzMkFycmF5KFtyZXN1bHQueCArIHZlY3Rvci54LCByZXN1bHQueSArIHZlY3Rvci55XSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFN1YnRyYWN0cyB0d28gdmVjdG9ycy5cbiAgICAgKiBAcGFyYW0gX2EgVGhlIHZlY3RvciB0byBzdWJ0cmFjdCBmcm9tLlxuICAgICAqIEBwYXJhbSBfYiBUaGUgdmVjdG9yIHRvIHN1YnRyYWN0LlxuICAgICAqIEByZXR1cm5zIEEgbmV3IHZlY3RvciByZXByZXNlbnRpbmcgdGhlIGRpZmZlcmVuY2Ugb2YgdGhlIGdpdmVuIHZlY3RvcnNcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIERJRkZFUkVOQ0UoX2E6IFZlY3RvcjIsIF9iOiBWZWN0b3IyKTogVmVjdG9yMiB7XG4gICAgICBsZXQgdmVjdG9yOiBWZWN0b3IyID0gbmV3IFZlY3RvcjI7XG4gICAgICB2ZWN0b3IuZGF0YSA9IG5ldyBGbG9hdDMyQXJyYXkoW19hLnggLSBfYi54LCBfYS55IC0gX2IueV0pO1xuICAgICAgcmV0dXJuIHZlY3RvcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb21wdXRlcyB0aGUgZG90cHJvZHVjdCBvZiAyIHZlY3RvcnMuXG4gICAgICogQHBhcmFtIF9hIFRoZSB2ZWN0b3IgdG8gbXVsdGlwbHkuXG4gICAgICogQHBhcmFtIF9iIFRoZSB2ZWN0b3IgdG8gbXVsdGlwbHkgYnkuXG4gICAgICogQHJldHVybnMgQSBuZXcgdmVjdG9yIHJlcHJlc2VudGluZyB0aGUgZG90cHJvZHVjdCBvZiB0aGUgZ2l2ZW4gdmVjdG9yc1xuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgRE9UKF9hOiBWZWN0b3IyLCBfYjogVmVjdG9yMik6IG51bWJlciB7XG4gICAgICBsZXQgc2NhbGFyUHJvZHVjdDogbnVtYmVyID0gX2EueCAqIF9iLnggKyBfYS55ICogX2IueTtcbiAgICAgIHJldHVybiBzY2FsYXJQcm9kdWN0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIG1hZ25pdHVkZSBvZiBhIGdpdmVuIHZlY3Rvci5cbiAgICAgKiBJZiB5b3Ugb25seSBuZWVkIHRvIGNvbXBhcmUgbWFnbml0dWRlcyBvZiBkaWZmZXJlbnQgdmVjdG9ycywgeW91IGNhbiBjb21wYXJlIHNxdWFyZWQgbWFnbml0dWRlcyB1c2luZyBWZWN0b3IyLk1BR05JVFVERVNRUiBpbnN0ZWFkLlxuICAgICAqIEBzZWUgVmVjdG9yMi5NQUdOSVRVREVTUVJcbiAgICAgKiBAcGFyYW0gX3ZlY3RvciBUaGUgdmVjdG9yIHRvIGdldCB0aGUgbWFnbml0dWRlIG9mLlxuICAgICAqIEByZXR1cm5zIEEgbnVtYmVyIHJlcHJlc2VudGluZyB0aGUgbWFnbml0dWRlIG9mIHRoZSBnaXZlbiB2ZWN0b3IuXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBNQUdOSVRVREUoX3ZlY3RvcjogVmVjdG9yMik6IG51bWJlciB7XG4gICAgICBsZXQgbWFnbml0dWRlOiBudW1iZXIgPSBNYXRoLnNxcnQoVmVjdG9yMi5NQUdOSVRVREVTUVIoX3ZlY3RvcikpO1xuICAgICAgcmV0dXJuIG1hZ25pdHVkZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBzcXVhcmVkIG1hZ25pdHVkZSBvZiBhIGdpdmVuIHZlY3Rvci4gTXVjaCBsZXNzIGNhbGN1bGF0aW9uIGludGVuc2l2ZSB0aGFuIFZlY3RvcjIuTUFHTklUVURFLCBzaG91bGQgYmUgdXNlZCBpbnN0ZWFkIGlmIHBvc3NpYmxlLlxuICAgICAqIEBwYXJhbSBfdmVjdG9yIFRoZSB2ZWN0b3IgdG8gZ2V0IHRoZSBzcXVhcmVkIG1hZ25pdHVkZSBvZi5cbiAgICAgKiBAcmV0dXJucyBBIG51bWJlciByZXByZXNlbnRpbmcgdGhlIHNxdWFyZWQgbWFnbml0dWRlIG9mIHRoZSBnaXZlbiB2ZWN0b3IuXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBNQUdOSVRVREVTUVIoX3ZlY3RvcjogVmVjdG9yMik6IG51bWJlciB7XG4gICAgICBsZXQgbWFnbml0dWRlOiBudW1iZXIgPSBWZWN0b3IyLkRPVChfdmVjdG9yLCBfdmVjdG9yKTtcbiAgICAgIHJldHVybiBtYWduaXR1ZGU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgY3Jvc3MgcHJvZHVjdCBvZiB0d28gVmVjdG9ycy4gRHVlIHRvIHRoZW0gYmVpbmcgb25seSAyIERpbWVuc2lvbmFsLCB0aGUgcmVzdWx0IGlzIGEgc2luZ2xlIG51bWJlcixcbiAgICAgKiB3aGljaCBpbXBsaWNpdGx5IGlzIG9uIHRoZSBaIGF4aXMuIEl0IGlzIGFsc28gdGhlIHNpZ25lZCBtYWduaXR1ZGUgb2YgdGhlIHJlc3VsdC5cbiAgICAgKiBAcGFyYW0gX2EgVmVjdG9yIHRvIGNvbXB1dGUgdGhlIGNyb3NzIHByb2R1Y3Qgb25cbiAgICAgKiBAcGFyYW0gX2IgVmVjdG9yIHRvIGNvbXB1dGUgdGhlIGNyb3NzIHByb2R1Y3Qgd2l0aFxuICAgICAqIEByZXR1cm5zIEEgbnVtYmVyIHJlcHJlc2VudGluZyByZXN1bHQgb2YgdGhlIGNyb3NzIHByb2R1Y3QuXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBDUk9TU1BST0RVQ1QoX2E6IFZlY3RvcjIsIF9iOiBWZWN0b3IyKTogbnVtYmVyIHtcbiAgICAgIGxldCBjcm9zc1Byb2R1Y3Q6IG51bWJlciA9IF9hLnggKiBfYi55IC0gX2EueSAqIF9iLng7XG4gICAgICByZXR1cm4gY3Jvc3NQcm9kdWN0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIG9ydGhvZ29uYWwgdmVjdG9yIHRvIHRoZSBnaXZlbiB2ZWN0b3IuIFJvdGF0ZXMgY291bnRlcmNsb2Nrd2lzZSBieSBkZWZhdWx0LlxuICAgICAqIGBgYHBsYWludGV4dFxuICAgICAqICAgIF4gICAgICAgICAgICAgICAgfFxuICAgICAqICAgIHwgID0+ICA8LS0gID0+ICAgdiAgPT4gIC0tPlxuICAgICAqIGBgYFxuICAgICAqIEBwYXJhbSBfdmVjdG9yIFZlY3RvciB0byBnZXQgdGhlIG9ydGhvZ29uYWwgZXF1aXZhbGVudCBvZlxuICAgICAqIEBwYXJhbSBfY2xvY2t3aXNlIFNob3VsZCB0aGUgcm90YXRpb24gYmUgY2xvY2t3aXNlIGluc3RlYWQgb2YgdGhlIGRlZmF1bHQgY291bnRlcmNsb2Nrd2lzZT8gZGVmYXVsdDogZmFsc2VcbiAgICAgKiBAcmV0dXJucyBBIFZlY3RvciB0aGF0IGlzIG9ydGhvZ29uYWwgdG8gYW5kIGhhcyB0aGUgc2FtZSBtYWduaXR1ZGUgYXMgdGhlIGdpdmVuIFZlY3Rvci4gIFxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgT1JUSE9HT05BTChfdmVjdG9yOiBWZWN0b3IyLCBfY2xvY2t3aXNlOiBib29sZWFuID0gZmFsc2UpOiBWZWN0b3IyIHtcbiAgICAgIGlmIChfY2xvY2t3aXNlKSByZXR1cm4gbmV3IFZlY3RvcjIoX3ZlY3Rvci55LCAtX3ZlY3Rvci54KTtcbiAgICAgIGVsc2UgcmV0dXJuIG5ldyBWZWN0b3IyKC1fdmVjdG9yLnksIF92ZWN0b3IueCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQWRkcyB0aGUgZ2l2ZW4gdmVjdG9yIHRvIHRoZSBleGVjdXRpbmcgdmVjdG9yLCBjaGFuZ2luZyB0aGUgZXhlY3V0b3IuXG4gICAgICogQHBhcmFtIF9hZGRlbmQgVGhlIHZlY3RvciB0byBhZGQuXG4gICAgICovXG4gICAgcHVibGljIGFkZChfYWRkZW5kOiBWZWN0b3IyKTogdm9pZCB7XG4gICAgICB0aGlzLmRhdGEgPSBuZXcgVmVjdG9yMihfYWRkZW5kLnggKyB0aGlzLngsIF9hZGRlbmQueSArIHRoaXMueSkuZGF0YTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTdWJ0cmFjdHMgdGhlIGdpdmVuIHZlY3RvciBmcm9tIHRoZSBleGVjdXRpbmcgdmVjdG9yLCBjaGFuZ2luZyB0aGUgZXhlY3V0b3IuXG4gICAgICogQHBhcmFtIF9zdWJ0cmFoZW5kIFRoZSB2ZWN0b3IgdG8gc3VidHJhY3QuXG4gICAgICovXG4gICAgcHVibGljIHN1YnRyYWN0KF9zdWJ0cmFoZW5kOiBWZWN0b3IyKTogdm9pZCB7XG4gICAgICB0aGlzLmRhdGEgPSBuZXcgVmVjdG9yMih0aGlzLnggLSBfc3VidHJhaGVuZC54LCB0aGlzLnkgLSBfc3VidHJhaGVuZC55KS5kYXRhO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNjYWxlcyB0aGUgVmVjdG9yIGJ5IHRoZSBfc2NhbGUuXG4gICAgICogQHBhcmFtIF9zY2FsZSBUaGUgc2NhbGUgdG8gbXVsdGlwbHkgdGhlIHZlY3RvciB3aXRoLlxuICAgICAqL1xuICAgIHB1YmxpYyBzY2FsZShfc2NhbGU6IG51bWJlcik6IHZvaWQge1xuICAgICAgdGhpcy5kYXRhID0gbmV3IFZlY3RvcjIoX3NjYWxlICogdGhpcy54LCBfc2NhbGUgKiB0aGlzLnkpLmRhdGE7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTm9ybWFsaXplcyB0aGUgdmVjdG9yLlxuICAgICAqIEBwYXJhbSBfbGVuZ3RoIEEgbW9kaWZpY2F0b3IgdG8gZ2V0IGEgZGlmZmVyZW50IGxlbmd0aCBvZiBub3JtYWxpemVkIHZlY3Rvci5cbiAgICAgKi9cbiAgICBwdWJsaWMgbm9ybWFsaXplKF9sZW5ndGg6IG51bWJlciA9IDEpOiB2b2lkIHtcbiAgICAgIHRoaXMuZGF0YSA9IFZlY3RvcjIuTk9STUFMSVpBVElPTih0aGlzLCBfbGVuZ3RoKS5kYXRhO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNldHMgdGhlIFZlY3RvciB0byB0aGUgZ2l2ZW4gcGFyYW1ldGVycy4gT21taXR0ZWQgcGFyYW1ldGVycyBkZWZhdWx0IHRvIDAuXG4gICAgICogQHBhcmFtIF94IG5ldyB4IHRvIHNldFxuICAgICAqIEBwYXJhbSBfeSBuZXcgeSB0byBzZXRcbiAgICAgKi9cbiAgICBwdWJsaWMgc2V0KF94OiBudW1iZXIgPSAwLCBfeTogbnVtYmVyID0gMCk6IHZvaWQge1xuICAgICAgdGhpcy5kYXRhID0gbmV3IEZsb2F0MzJBcnJheShbX3gsIF95XSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIHdoZXRoZXIgdGhlIGdpdmVuIFZlY3RvciBpcyBlcXVhbCB0byB0aGUgZXhlY3V0ZWQgVmVjdG9yLlxuICAgICAqIEBwYXJhbSBfdmVjdG9yIFRoZSB2ZWN0b3IgdG8gY29tYXByZSB3aXRoLlxuICAgICAqIEByZXR1cm5zIHRydWUgaWYgdGhlIHR3byB2ZWN0b3JzIGFyZSBlcXVhbCwgb3RoZXJ3aXNlIGZhbHNlXG4gICAgICovXG4gICAgcHVibGljIGVxdWFscyhfdmVjdG9yOiBWZWN0b3IyKTogYm9vbGVhbiB7XG4gICAgICBpZiAodGhpcy5kYXRhWzBdID09IF92ZWN0b3IuZGF0YVswXSAmJiB0aGlzLmRhdGFbMV0gPT0gX3ZlY3Rvci5kYXRhWzFdKSByZXR1cm4gdHJ1ZTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcmV0dXJucyBBbiBhcnJheSBvZiB0aGUgZGF0YSBvZiB0aGUgdmVjdG9yXG4gICAgICovXG4gICAgcHVibGljIGdldCgpOiBGbG9hdDMyQXJyYXkge1xuICAgICAgcmV0dXJuIG5ldyBGbG9hdDMyQXJyYXkodGhpcy5kYXRhKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcmV0dXJucyBBIGRlZXAgY29weSBvZiB0aGUgdmVjdG9yLlxuICAgICAqL1xuICAgIHB1YmxpYyBnZXQgY29weSgpOiBWZWN0b3IyIHtcbiAgICAgIHJldHVybiBuZXcgVmVjdG9yMih0aGlzLngsIHRoaXMueSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQWRkcyBhIHotY29tcG9uZW50IHRvIHRoZSB2ZWN0b3IgYW5kIHJldHVybnMgYSBuZXcgVmVjdG9yM1xuICAgICAqL1xuICAgIHB1YmxpYyB0b1ZlY3RvcjMoKTogVmVjdG9yMyB7XG4gICAgICByZXR1cm4gbmV3IFZlY3RvcjModGhpcy54LCB0aGlzLnksIDApO1xuICAgIH1cblxuICAgIHB1YmxpYyBnZXRNdXRhdG9yKCk6IE11dGF0b3Ige1xuICAgICAgbGV0IG11dGF0b3I6IE11dGF0b3IgPSB7XG4gICAgICAgIHg6IHRoaXMuZGF0YVswXSwgeTogdGhpcy5kYXRhWzFdXG4gICAgICB9O1xuICAgICAgcmV0dXJuIG11dGF0b3I7XG4gICAgfVxuICAgIHByb3RlY3RlZCByZWR1Y2VNdXRhdG9yKF9tdXRhdG9yOiBNdXRhdG9yKTogdm9pZCB7LyoqICovIH1cbiAgfVxufSIsIm5hbWVzcGFjZSBGdWRnZUNvcmUge1xuICAgIC8qKlxuICAgICAqIFN0b3JlcyBhbmQgbWFuaXB1bGF0ZXMgYSB0aHJlZWRpbWVuc2lvbmFsIHZlY3RvciBjb21wcmlzZWQgb2YgdGhlIGNvbXBvbmVudHMgeCwgeSBhbmQgelxuICAgICAqIGBgYHBsYWludGV4dFxuICAgICAqICAgICAgICAgICAgK3lcbiAgICAgKiAgICAgICAgICAgICB8X18gK3hcbiAgICAgKiAgICAgICAgICAgIC9cbiAgICAgKiAgICAgICAgICAreiAgIFxuICAgICAqIGBgYFxuICAgICAqIEBhdXRob3JzIEphc2NoYSBLYXJhZ8O2bCwgSEZVLCAyMDE5IHwgSmlya2EgRGVsbCdPcm8tRnJpZWRsLCBIRlUsIDIwMTlcbiAgICAgKi9cbiAgICBleHBvcnQgY2xhc3MgVmVjdG9yMyBleHRlbmRzIE11dGFibGUge1xuICAgICAgICBwcml2YXRlIGRhdGE6IEZsb2F0MzJBcnJheTsgLy8gVE9ETzogY2hlY2sgd2h5IHRoaXMgc2hvdWxkbid0IGJlIHgseSx6IGFzIG51bWJlcnMuLi5cblxuICAgICAgICBwdWJsaWMgY29uc3RydWN0b3IoX3g6IG51bWJlciA9IDAsIF95OiBudW1iZXIgPSAwLCBfejogbnVtYmVyID0gMCkge1xuICAgICAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgICAgIHRoaXMuZGF0YSA9IG5ldyBGbG9hdDMyQXJyYXkoW194LCBfeSwgX3pdKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRPRE86IGltcGxlbWVudCBlcXVhbHMtZnVuY3Rpb25zXG4gICAgICAgIGdldCB4KCk6IG51bWJlciB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhWzBdO1xuICAgICAgICB9XG4gICAgICAgIGdldCB5KCk6IG51bWJlciB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhWzFdO1xuICAgICAgICB9XG4gICAgICAgIGdldCB6KCk6IG51bWJlciB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhWzJdO1xuICAgICAgICB9XG5cbiAgICAgICAgc2V0IHgoX3g6IG51bWJlcikge1xuICAgICAgICAgICAgdGhpcy5kYXRhWzBdID0gX3g7XG4gICAgICAgIH1cbiAgICAgICAgc2V0IHkoX3k6IG51bWJlcikge1xuICAgICAgICAgICAgdGhpcy5kYXRhWzFdID0gX3k7XG4gICAgICAgIH1cbiAgICAgICAgc2V0IHooX3o6IG51bWJlcikge1xuICAgICAgICAgICAgdGhpcy5kYXRhWzJdID0gX3o7XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgc3RhdGljIFgoX3NjYWxlOiBudW1iZXIgPSAxKTogVmVjdG9yMyB7XG4gICAgICAgICAgICBjb25zdCB2ZWN0b3I6IFZlY3RvcjMgPSBuZXcgVmVjdG9yMyhfc2NhbGUsIDAsIDApO1xuICAgICAgICAgICAgcmV0dXJuIHZlY3RvcjtcbiAgICAgICAgfVxuXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgWShfc2NhbGU6IG51bWJlciA9IDEpOiBWZWN0b3IzIHtcbiAgICAgICAgICAgIGNvbnN0IHZlY3RvcjogVmVjdG9yMyA9IG5ldyBWZWN0b3IzKDAsIF9zY2FsZSwgMCk7XG4gICAgICAgICAgICByZXR1cm4gdmVjdG9yO1xuICAgICAgICB9XG5cbiAgICAgICAgcHVibGljIHN0YXRpYyBaKF9zY2FsZTogbnVtYmVyID0gMSk6IFZlY3RvcjMge1xuICAgICAgICAgICAgY29uc3QgdmVjdG9yOiBWZWN0b3IzID0gbmV3IFZlY3RvcjMoMCwgMCwgX3NjYWxlKTtcbiAgICAgICAgICAgIHJldHVybiB2ZWN0b3I7XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgc3RhdGljIFpFUk8oKTogVmVjdG9yMyB7XG4gICAgICAgICAgICBjb25zdCB2ZWN0b3I6IFZlY3RvcjMgPSBuZXcgVmVjdG9yMygwLCAwLCAwKTtcbiAgICAgICAgICAgIHJldHVybiB2ZWN0b3I7XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgc3RhdGljIE9ORShfc2NhbGU6IG51bWJlciA9IDEpOiBWZWN0b3IzIHtcbiAgICAgICAgICAgIGNvbnN0IHZlY3RvcjogVmVjdG9yMyA9IG5ldyBWZWN0b3IzKF9zY2FsZSwgX3NjYWxlLCBfc2NhbGUpO1xuICAgICAgICAgICAgcmV0dXJuIHZlY3RvcjtcbiAgICAgICAgfVxuXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgVFJBTlNGT1JNQVRJT04oX3ZlY3RvcjogVmVjdG9yMywgX21hdHJpeDogTWF0cml4NHg0LCBfaW5jbHVkZVRyYW5zbGF0aW9uOiBib29sZWFuID0gdHJ1ZSk6IFZlY3RvcjMge1xuICAgICAgICAgICAgbGV0IHJlc3VsdDogVmVjdG9yMyA9IG5ldyBWZWN0b3IzKCk7XG4gICAgICAgICAgICBsZXQgbTogRmxvYXQzMkFycmF5ID0gX21hdHJpeC5nZXQoKTtcbiAgICAgICAgICAgIGxldCBbeCwgeSwgel0gPSBfdmVjdG9yLmdldCgpO1xuICAgICAgICAgICAgcmVzdWx0LnggPSBtWzBdICogeCArIG1bNF0gKiB5ICsgbVs4XSAqIHo7XG4gICAgICAgICAgICByZXN1bHQueSA9IG1bMV0gKiB4ICsgbVs1XSAqIHkgKyBtWzldICogejtcbiAgICAgICAgICAgIHJlc3VsdC56ID0gbVsyXSAqIHggKyBtWzZdICogeSArIG1bMTBdICogejtcblxuICAgICAgICAgICAgaWYgKF9pbmNsdWRlVHJhbnNsYXRpb24pIHtcbiAgICAgICAgICAgICAgICByZXN1bHQuYWRkKF9tYXRyaXgudHJhbnNsYXRpb24pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG5cblxuICAgICAgICBwdWJsaWMgc3RhdGljIE5PUk1BTElaQVRJT04oX3ZlY3RvcjogVmVjdG9yMywgX2xlbmd0aDogbnVtYmVyID0gMSk6IFZlY3RvcjMge1xuICAgICAgICAgICAgbGV0IHZlY3RvcjogVmVjdG9yMyA9IFZlY3RvcjMuWkVSTygpO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBsZXQgW3gsIHksIHpdID0gX3ZlY3Rvci5kYXRhO1xuICAgICAgICAgICAgICAgIGxldCBmYWN0b3I6IG51bWJlciA9IF9sZW5ndGggLyBNYXRoLmh5cG90KHgsIHksIHopO1xuICAgICAgICAgICAgICAgIHZlY3Rvci5kYXRhID0gbmV3IEZsb2F0MzJBcnJheShbX3ZlY3Rvci54ICogZmFjdG9yLCBfdmVjdG9yLnkgKiBmYWN0b3IsIF92ZWN0b3IueiAqIGZhY3Rvcl0pO1xuICAgICAgICAgICAgfSBjYXRjaCAoX2UpIHtcbiAgICAgICAgICAgICAgICBEZWJ1Zy53YXJuKF9lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB2ZWN0b3I7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogU3VtcyB1cCBtdWx0aXBsZSB2ZWN0b3JzLlxuICAgICAgICAgKiBAcGFyYW0gX3ZlY3RvcnMgQSBzZXJpZXMgb2YgdmVjdG9ycyB0byBzdW0gdXBcbiAgICAgICAgICogQHJldHVybnMgQSBuZXcgdmVjdG9yIHJlcHJlc2VudGluZyB0aGUgc3VtIG9mIHRoZSBnaXZlbiB2ZWN0b3JzXG4gICAgICAgICAqL1xuICAgICAgICBwdWJsaWMgc3RhdGljIFNVTSguLi5fdmVjdG9yczogVmVjdG9yM1tdKTogVmVjdG9yMyB7XG4gICAgICAgICAgICBsZXQgcmVzdWx0OiBWZWN0b3IzID0gbmV3IFZlY3RvcjMoKTtcbiAgICAgICAgICAgIGZvciAobGV0IHZlY3RvciBvZiBfdmVjdG9ycylcbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YSA9IG5ldyBGbG9hdDMyQXJyYXkoW3Jlc3VsdC54ICsgdmVjdG9yLngsIHJlc3VsdC55ICsgdmVjdG9yLnksIHJlc3VsdC56ICsgdmVjdG9yLnpdKTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFN1YnRyYWN0cyB0d28gdmVjdG9ycy5cbiAgICAgICAgICogQHBhcmFtIF9hIFRoZSB2ZWN0b3IgdG8gc3VidHJhY3QgZnJvbS5cbiAgICAgICAgICogQHBhcmFtIF9iIFRoZSB2ZWN0b3IgdG8gc3VidHJhY3QuXG4gICAgICAgICAqIEByZXR1cm5zIEEgbmV3IHZlY3RvciByZXByZXNlbnRpbmcgdGhlIGRpZmZlcmVuY2Ugb2YgdGhlIGdpdmVuIHZlY3RvcnNcbiAgICAgICAgICovXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgRElGRkVSRU5DRShfYTogVmVjdG9yMywgX2I6IFZlY3RvcjMpOiBWZWN0b3IzIHtcbiAgICAgICAgICAgIGxldCB2ZWN0b3I6IFZlY3RvcjMgPSBuZXcgVmVjdG9yMztcbiAgICAgICAgICAgIHZlY3Rvci5kYXRhID0gbmV3IEZsb2F0MzJBcnJheShbX2EueCAtIF9iLngsIF9hLnkgLSBfYi55LCBfYS56IC0gX2Iuel0pO1xuICAgICAgICAgICAgcmV0dXJuIHZlY3RvcjtcbiAgICAgICAgfVxuICAgICAgICAvKipcbiAgICAgICAgICogUmV0dXJucyBhIG5ldyB2ZWN0b3IgcmVwcmVzZW50aW5nIHRoZSBnaXZlbiB2ZWN0b3Igc2NhbGVkIGJ5IHRoZSBnaXZlbiBzY2FsaW5nIGZhY3RvclxuICAgICAgICAgKi9cbiAgICAgICAgcHVibGljIHN0YXRpYyBTQ0FMRShfdmVjdG9yOiBWZWN0b3IzLCBfc2NhbGluZzogbnVtYmVyKTogVmVjdG9yMyB7XG4gICAgICAgICAgICBsZXQgc2NhbGVkOiBWZWN0b3IzID0gbmV3IFZlY3RvcjMoKTtcbiAgICAgICAgICAgIHNjYWxlZC5kYXRhID0gbmV3IEZsb2F0MzJBcnJheShbX3ZlY3Rvci54ICogX3NjYWxpbmcsIF92ZWN0b3IueSAqIF9zY2FsaW5nLCBfdmVjdG9yLnogKiBfc2NhbGluZ10pO1xuICAgICAgICAgICAgcmV0dXJuIHNjYWxlZDtcbiAgICAgICAgfVxuICAgICAgICAvKipcbiAgICAgICAgICogQ29tcHV0ZXMgdGhlIGNyb3NzcHJvZHVjdCBvZiAyIHZlY3RvcnMuXG4gICAgICAgICAqIEBwYXJhbSBfYSBUaGUgdmVjdG9yIHRvIG11bHRpcGx5LlxuICAgICAgICAgKiBAcGFyYW0gX2IgVGhlIHZlY3RvciB0byBtdWx0aXBseSBieS5cbiAgICAgICAgICogQHJldHVybnMgQSBuZXcgdmVjdG9yIHJlcHJlc2VudGluZyB0aGUgY3Jvc3Nwcm9kdWN0IG9mIHRoZSBnaXZlbiB2ZWN0b3JzXG4gICAgICAgICAqL1xuICAgICAgICBwdWJsaWMgc3RhdGljIENST1NTKF9hOiBWZWN0b3IzLCBfYjogVmVjdG9yMyk6IFZlY3RvcjMge1xuICAgICAgICAgICAgbGV0IHZlY3RvcjogVmVjdG9yMyA9IG5ldyBWZWN0b3IzO1xuICAgICAgICAgICAgdmVjdG9yLmRhdGEgPSBuZXcgRmxvYXQzMkFycmF5KFtcbiAgICAgICAgICAgICAgICBfYS55ICogX2IueiAtIF9hLnogKiBfYi55LFxuICAgICAgICAgICAgICAgIF9hLnogKiBfYi54IC0gX2EueCAqIF9iLnosXG4gICAgICAgICAgICAgICAgX2EueCAqIF9iLnkgLSBfYS55ICogX2IueF0pO1xuICAgICAgICAgICAgcmV0dXJuIHZlY3RvcjtcbiAgICAgICAgfVxuICAgICAgICAvKipcbiAgICAgICAgICogQ29tcHV0ZXMgdGhlIGRvdHByb2R1Y3Qgb2YgMiB2ZWN0b3JzLlxuICAgICAgICAgKiBAcGFyYW0gX2EgVGhlIHZlY3RvciB0byBtdWx0aXBseS5cbiAgICAgICAgICogQHBhcmFtIF9iIFRoZSB2ZWN0b3IgdG8gbXVsdGlwbHkgYnkuXG4gICAgICAgICAqIEByZXR1cm5zIEEgbmV3IHZlY3RvciByZXByZXNlbnRpbmcgdGhlIGRvdHByb2R1Y3Qgb2YgdGhlIGdpdmVuIHZlY3RvcnNcbiAgICAgICAgICovXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgRE9UKF9hOiBWZWN0b3IzLCBfYjogVmVjdG9yMyk6IG51bWJlciB7XG4gICAgICAgICAgICBsZXQgc2NhbGFyUHJvZHVjdDogbnVtYmVyID0gX2EueCAqIF9iLnggKyBfYS55ICogX2IueSArIF9hLnogKiBfYi56O1xuICAgICAgICAgICAgcmV0dXJuIHNjYWxhclByb2R1Y3Q7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogQ2FsY3VsYXRlcyBhbmQgcmV0dXJucyB0aGUgcmVmbGVjdGlvbiBvZiB0aGUgaW5jb21pbmcgdmVjdG9yIGF0IHRoZSBnaXZlbiBub3JtYWwgdmVjdG9yLiBUaGUgbGVuZ3RoIG9mIG5vcm1hbCBzaG91bGQgYmUgMS5cbiAgICAgICAgICogICAgIF9fX19fX19fX19fX19fX19fX1xuICAgICAgICAgKiAgICAgICAgICAgL3xcXFxuICAgICAgICAgKiBpbmNvbWluZyAvIHwgXFwgcmVmbGVjdGlvblxuICAgICAgICAgKiAgICAgICAgIC8gIHwgIFxcICAgXG4gICAgICAgICAqICAgICAgICAgIG5vcm1hbFxuICAgICAgICAgKiBcbiAgICAgICAgICovXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgUkVGTEVDVElPTihfaW5jb21pbmc6IFZlY3RvcjMsIF9ub3JtYWw6IFZlY3RvcjMpOiBWZWN0b3IzIHtcbiAgICAgICAgICAgIGxldCBkb3Q6IG51bWJlciA9IC1WZWN0b3IzLkRPVChfaW5jb21pbmcsIF9ub3JtYWwpO1xuICAgICAgICAgICAgbGV0IHJlZmxlY3Rpb246IFZlY3RvcjMgPSBWZWN0b3IzLlNVTShfaW5jb21pbmcsIFZlY3RvcjMuU0NBTEUoX25vcm1hbCwgMiAqIGRvdCkpO1xuICAgICAgICAgICAgcmV0dXJuIHJlZmxlY3Rpb247XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgYWRkKF9hZGRlbmQ6IFZlY3RvcjMpOiB2b2lkIHtcbiAgICAgICAgICAgIHRoaXMuZGF0YSA9IG5ldyBWZWN0b3IzKF9hZGRlbmQueCArIHRoaXMueCwgX2FkZGVuZC55ICsgdGhpcy55LCBfYWRkZW5kLnogKyB0aGlzLnopLmRhdGE7XG4gICAgICAgIH1cbiAgICAgICAgcHVibGljIHN1YnRyYWN0KF9zdWJ0cmFoZW5kOiBWZWN0b3IzKTogdm9pZCB7XG4gICAgICAgICAgICB0aGlzLmRhdGEgPSBuZXcgVmVjdG9yMyh0aGlzLnggLSBfc3VidHJhaGVuZC54LCB0aGlzLnkgLSBfc3VidHJhaGVuZC55LCB0aGlzLnogLSBfc3VidHJhaGVuZC56KS5kYXRhO1xuICAgICAgICB9XG4gICAgICAgIHB1YmxpYyBzY2FsZShfc2NhbGU6IG51bWJlcik6IHZvaWQge1xuICAgICAgICAgICAgdGhpcy5kYXRhID0gbmV3IFZlY3RvcjMoX3NjYWxlICogdGhpcy54LCBfc2NhbGUgKiB0aGlzLnksIF9zY2FsZSAqIHRoaXMueikuZGF0YTtcbiAgICAgICAgfVxuXG4gICAgICAgIHB1YmxpYyBub3JtYWxpemUoX2xlbmd0aDogbnVtYmVyID0gMSk6IHZvaWQge1xuICAgICAgICAgICAgdGhpcy5kYXRhID0gVmVjdG9yMy5OT1JNQUxJWkFUSU9OKHRoaXMsIF9sZW5ndGgpLmRhdGE7XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgc2V0KF94OiBudW1iZXIgPSAwLCBfeTogbnVtYmVyID0gMCwgX3o6IG51bWJlciA9IDApOiB2b2lkIHtcbiAgICAgICAgICAgIHRoaXMuZGF0YSA9IG5ldyBGbG9hdDMyQXJyYXkoW194LCBfeSwgX3pdKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHB1YmxpYyBnZXQoKTogRmxvYXQzMkFycmF5IHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgRmxvYXQzMkFycmF5KHRoaXMuZGF0YSk7XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgZ2V0IGNvcHkoKTogVmVjdG9yMyB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFZlY3RvcjModGhpcy54LCB0aGlzLnksIHRoaXMueik7XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgdHJhbnNmb3JtKF9tYXRyaXg6IE1hdHJpeDR4NCwgX2luY2x1ZGVUcmFuc2xhdGlvbjogYm9vbGVhbiA9IHRydWUpOiB2b2lkIHtcbiAgICAgICAgICAgIHRoaXMuZGF0YSA9IFZlY3RvcjMuVFJBTlNGT1JNQVRJT04odGhpcywgX21hdHJpeCwgX2luY2x1ZGVUcmFuc2xhdGlvbikuZGF0YTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEcm9wcyB0aGUgei1jb21wb25lbnQgYW5kIHJldHVybnMgYSBWZWN0b3IyIGNvbnNpc3Rpbmcgb2YgdGhlIHgtIGFuZCB5LWNvbXBvbmVudHNcbiAgICAgICAgICovXG4gICAgICAgIHB1YmxpYyB0b1ZlY3RvcjIoKTogVmVjdG9yMiB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFZlY3RvcjIodGhpcy54LCB0aGlzLnkpO1xuICAgICAgICB9XG5cbiAgICAgICAgcHVibGljIHJlZmxlY3QoX25vcm1hbDogVmVjdG9yMyk6IHZvaWQge1xuICAgICAgICAgICAgY29uc3QgcmVmbGVjdGVkOiBWZWN0b3IzID0gVmVjdG9yMy5SRUZMRUNUSU9OKHRoaXMsIF9ub3JtYWwpO1xuICAgICAgICAgICAgdGhpcy5zZXQocmVmbGVjdGVkLngsIHJlZmxlY3RlZC55LCByZWZsZWN0ZWQueik7XG4gICAgICAgICAgICBSZWN5Y2xl