import {ModelData} from '../render/program/animatedentityprogram';
import {PositionKeyframe, RotationKeyframe, ScalingKeyframe, AnimatedBone, Animation} from './animation';

export class AnimationResult {
    // Bone data: actual requested Float32Array containing 16 floats (matrices) for each bone in the model specified
    // Extra memory usage: How much memory was consumed to generate this data, on top of caches to produce this information?
    constructor (
        public boneData: Float32Array,
        public extraMemoryUsage: number
    ) {}
}

export abstract class AnimationManager {
    /**
     * Register an animation, containing all the bones, offsets, keyframes
     */
    public abstract registerAnimation(animation: Animation): void;

    /**
     * Register a model, containing the names (and order) of bones it uses, as well as the model-specific bone offsets
     */
    public abstract registerModel(model: ModelData): void;

    /**
     * Associates a model and animation together. In the case of a cache being used, this sets up all the caching that
     *  is needed. Otherwise, it just checks to make sure everything is OK and ready to go (names match up, essentially)
     * Returns true on success, false on failure
     */
    public abstract associateModelAndAnimation(animation: Animation, model: ModelData): boolean;

    /**
     * Get the information for a single animation for a model
     */
    public abstract getSingleAnimation(animation: Animation, model: ModelData, animationTime: number): AnimationResult;

    /**
     * Get the information for a blending of two animations for a model
     */
    public abstract getBlendedAnimation(animations: [Animation, Animation], model: ModelData, animationTimes: [number, number], blendFactor: number): AnimationResult;

    /**
     * How big is the resting memory footprint of this object? Size of all internally stored objects
     *  (for WASM, do not include the size of the entire heap)
     */
    public abstract getRestingMemoryUsage(): number;
}