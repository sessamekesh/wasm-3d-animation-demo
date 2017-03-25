import {Animation} from './animation';
import {AnimationManager, AnimationResult} from './animationmanager';
import {ModelData} from '../render/program/animatedentityprogram';

type EntityTrackAnimationInput = { startTime: number, animation: Animation };

export class Entity {
    protected i: number = 0;

    constructor (
        protected track: EntityTrack[]
    ) {}

    public update(dt: number): void {
        if (this.i >= this.track.length) return;
        if (this.track[this.i].isFinished()) { this.i++; return this.update(dt); }

        this.track[this.i].update(dt);
    }

    public isFinished() {
        return this.i >= this.track.length;
    }

    public getAnimationData(model: ModelData): AnimationResult {
        return this.track[this.i].getAnimationData(model);
    }

    public getTrackPos(): number {
        return this.track[this.i].getTrackPos();
    }
}

export class EntityTrack {
    protected tick: number;

    constructor (
        protected duration: number,
        protected animation1: EntityTrackAnimationInput,
        protected animation2: EntityTrackAnimationInput|null,
        protected animationManager: AnimationManager,
        protected startTrackPos: number,
        protected endTrackPos: number
    ) {
        this.tick = 0;
    }

    public update(dt: number) {
        this.tick += dt;
    }

    public isFinished(): boolean {
        return this.tick >= this.duration;
    }

    public getAnimationData(model: ModelData): AnimationResult {
        if (this.animation2) {
            return this.animationManager.getBlendedAnimation([this.animation1.animation, this.animation2.animation], model, [
                (this.animation1.startTime + this.tick),
                (this.animation1.startTime + this.tick)
            ], this.tick / this.duration);
        } else {
            return this.animationManager.getSingleAnimation(this.animation1.animation, model, this.animation1.startTime + this.tick);
        }
    }

    public getTrackPos(): number {
        return (this.endTrackPos - this.startTrackPos) * (this.tick / this.duration) + this.startTrackPos;
    }
};

export function CreateRandomDancingEntity(
    run: Animation,
    dances: Animation[],
    animationManager: AnimationManager,
    distanceToTravel: number,
    velocity: number,
    options?: {
        minStartRunTime?: number,
        maxStartRunTime?: number
        minEndRunTime?: number,
        maxEndRunTime?: number,
        minDanceBreaks?: number,
        maxDanceBreaks?: number,
        minDanceCycles?: number,
        maxDanceCycles?: number,
        danceFadeInTime?: number,
        danceFadeOutTime?: number
    }
): Entity {
    options = options || {};

    options.minStartRunTime = options.minStartRunTime || (distanceToTravel / velocity) * 0.1;
    options.maxStartRunTime = options.maxStartRunTime || (distanceToTravel / velocity) * 0.8;
    options.minEndRunTime = options.minEndRunTime || (distanceToTravel / velocity) * 0.1;
    options.maxEndRunTime = options.maxEndRunTime || (distanceToTravel / velocity) * 0.2;
    options.minDanceBreaks = options.minDanceBreaks || 1;
    options.maxDanceBreaks = options.maxDanceBreaks || 4;
    options.minDanceCycles = options.minDanceCycles || 1;
    options.maxDanceCycles = options.maxDanceCycles || 2;
    options.danceFadeInTime = options.danceFadeInTime || 0.2;
    options.danceFadeOutTime = options.danceFadeOutTime || options.danceFadeInTime;

    let tr: EntityTrack[] = [];

    let runningTimeRemaining = distanceToTravel / velocity;
    let endRunTime = Math.random() * (options.maxEndRunTime - options.minEndRunTime) + options.minEndRunTime;

    let previousAnimation: Animation|null = null;

    // Start with running for an amount of time
    let startRunTime = Math.random() * (options.maxStartRunTime - options.minStartRunTime) + options.minStartRunTime;
    let trackPos = 0;
    tr.push(new EntityTrack(
        startRunTime,
        { startTime: 0, animation: run },
        null,
        animationManager,
        trackPos, trackPos = velocity * startRunTime
    ));
    runningTimeRemaining -= startRunTime;

    // In the middle, have dances, interspersed by runnings
    let numDanceBreaks = Math.round(Math.random() * (options.maxDanceBreaks - options.minDanceBreaks)) + options.minDanceBreaks;
    let timeDelta = (runningTimeRemaining - endRunTime) / numDanceBreaks;

    for (let i = 0; i < numDanceBreaks; i++) {
        let animIndex = Math.floor(Math.random() * dances.length);
        // Fade in to dancing
        let numCycles = Math.round(Math.random() * (options.maxDanceBreaks - options.minDanceCycles)) + options.minDanceCycles;
        options.danceFadeInTime && tr.push(new EntityTrack(
            options.danceFadeInTime,
            { startTime: 0, animation: run },
            { startTime: 0, animation: dances[animIndex] },
            animationManager,
            trackPos, trackPos
        ));

        // Dance!
        tr.push(new EntityTrack(
            numCycles * dances[animIndex].duration - options.danceFadeInTime - options.danceFadeOutTime,
            { startTime: options.danceFadeInTime, animation: dances[animIndex] },
            null,
            animationManager,
            trackPos, trackPos
        ));

        // Fade out of dancing
        options.danceFadeOutTime && tr.push(new EntityTrack(
            options.danceFadeOutTime,
            { startTime: dances[animIndex].duration - options.danceFadeOutTime, animation: dances[animIndex] },
            { startTime: 0, animation: run },
            animationManager,
            trackPos, trackPos
        ));

        // Run
        tr.push(new EntityTrack(
            timeDelta,
            { startTime: options.danceFadeOutTime || 0, animation: run },
            null,
            animationManager,
            trackPos, trackPos += velocity * timeDelta
        ));
    }

    return new Entity(tr);
};