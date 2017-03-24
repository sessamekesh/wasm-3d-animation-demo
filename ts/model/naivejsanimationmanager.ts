import {Animation} from './animation';
import {AnimationManager, AnimationResult} from './animationmanager';
import {ModelData} from '../render/program/animatedentityprogram';

// TODO SESS: Implement this

/**
 * The Naive JS Animation Manager re-does all the work upon every request to figure out the animation data.
 *  Registering an animation does absolutely nothing.
 *  Registering a model does absolutely nothing.
 *  Associating a model and an animation checks to make sure all the bone names match.
 *  Getting animation data scans through every channel on an animation for the transform of that bone at that moment,
 *   generates the matrices on the fly, and returns that data.
 *  Resting memory usage: 0. There are no members of this method, so there is no memory used that we're counting.
 *   Obviously JavaScript functions take up some memory, as well as any closures we might create.
 */
export class NaiveJSAnimationManager extends AnimationManager {
    constructor() { super(); }

    public registerAnimation(animation: Animation): void {
        throw new Error('Method not implemented.');
    }
    public registerModel(model: ModelData): void {
        throw new Error('Method not implemented.');
    }
    public associateModelAndAnimation(animation: Animation, model: ModelData): boolean {
        throw new Error('Method not implemented.');
    }
    public getSingleAnimation(animation: Animation, model: ModelData, animationTime: number): AnimationResult {
        throw new Error('Method not implemented.');
    }
    public getBlendedAnimation(animations: [Animation, Animation], model: ModelData, animationTimes: [number, number], blendFactor: number): AnimationResult {
        throw new Error('Method not implemented.');
    }
    public getRestingMemoryUsage(): number {
        throw new Error('Method not implemented.');
    }
}