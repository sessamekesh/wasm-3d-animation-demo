import {Animation, AnimatedBone} from './animation';
import {AnimationManager, AnimationResult} from './animationmanager';
import {ModelData} from '../render/program/animatedentityprogram';

import {Mat4} from '../math/mat4';
import {Quaternion} from '../math/quaternion';
import {Vec3} from '../math/vec3';

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

    public load(): Promise<boolean> {
        return Promise.resolve(true); // No loading required
    }

    public registerAnimation(animation: Animation): void {
        // No-op for naive system
    }
    public registerModel(model: ModelData): void {
        // No-op for naive system
    }
    public associateModelAndAnimation(animation: Animation, model: ModelData): boolean {
        // Simply make sure that the animaiton and model are compatible - i.e., that the animation
        //  contains all the bones that the modle needs to operate
        for (var i = 0; i < model.boneNames.length; i++) {
            var name = model.boneNames[i];
            // TODO SESS: Is it necessary to check both? All of them _should_ be in the static bones...
            if (!(animation.staticBones.has(name) || animation.animatedBones.has(name))) {
                console.warn('ASSOCIATION FALIED: Bone', name, 'in model', model, 'missing from animation', animation);
                return false;
            }
        }

        return true;
    }
    public getSingleAnimation(animation: Animation, model: ModelData, animationTime: number): AnimationResult {
        var rslBuffer = new Float32Array(model.boneNames.length * 16);

        for (var idx = 0; idx < model.boneNames.length; idx++) {
            var animatedTransform = this.getAnimatedNodeTransform(animation, animationTime, model.boneNames[idx]);
            rslBuffer.set(
                Mat4.mul(animatedTransform, model.boneOffsets[idx]).data,
                idx * 16
            );
        }

        var extraMemoryUsed =
            rslBuffer.length * Float32Array.BYTES_PER_ELEMENT // Actual result buffer created
            + 10 * Float32Array.BYTES_PER_ELEMENT // pos, rot, scl for individual transform (done iteratively)
            + 16 * Float32Array.BYTES_PER_ELEMENT // Transform matrix computed from pos, rot, scl
        ;

        return new AnimationResult(rslBuffer, extraMemoryUsed);
    }
    public getBlendedAnimation(animations: [Animation, Animation], model: ModelData, animationTimes: [number, number], blendFactor: number): AnimationResult {
        // Do a cheap interpolation here (matrix) - not as accurate, but it is sufficient
        var r1 = this.getSingleAnimation(animations[0], model, animationTimes[0]);
        var r2 = this.getSingleAnimation(animations[1], model, animationTimes[1]);

        var lerp = (a: number, b: number, t: number) => {
            return a * (1 - t) + b * t;
        };

        var rslBuffer = new Float32Array(model.boneNames.length * 16);
        for (var idx = 0; idx < rslBuffer.length; idx++) {
            rslBuffer[idx] = lerp(r1.boneData[idx], r2.boneData[idx], blendFactor);
        }

        var extraMemoryUsed =
            r1.extraMemoryUsage + r2.extraMemoryUsage
            + rslBuffer.length * Float32Array.BYTES_PER_ELEMENT;

        return new AnimationResult(rslBuffer, extraMemoryUsed);
    }
    public getRestingMemoryUsage(): number {
        // No data is cached in this manager, soooo no resting memory usage
        return 0;
    }

    //
    // Helpers
    //
    protected getAnimatedNodeTransform(animation: Animation, animationTime: number, nodeName?: string): Mat4 {
        if (!nodeName || nodeName === '') {
            return new Mat4();
        }

        var staticBone = animation.staticBones.get(nodeName);
        if (!staticBone) {
            console.warn('Bone', name, 'not found in animation - using identity', animation);
            return new Mat4();
        }

        var parentTransform = this.getAnimatedNodeTransform(animation, animationTime, staticBone.parent);
        var animatedBone = animation.animatedBones.get(nodeName);
        if (animatedBone) {
            var childTransform = this.getTransformAtTime(animatedBone, animationTime);
            return Mat4.mul(parentTransform, childTransform);
        } else {
            return Mat4.mul(parentTransform, staticBone.transform);
        }
    }

    protected getTransformAtTime(bone: AnimatedBone, time: number): Mat4 {
        // This is where the real expensive work goes - lots of processing numbers
        var pos: Vec3;
        var rot: Quaternion;
        var scl: Vec3 = new Vec3();

        // Get position component...
        if (bone.positionChannel.length === 1) {
            pos = bone.positionChannel[0].position;
        } else {
            var posTime = time % bone.positionChannel[bone.positionChannel.length - 1].time;
            if (posTime < 0) posTime = posTime + bone.positionChannel[bone.positionChannel.length - 1].time;

            var idx = 0;
            while ((idx < bone.positionChannel.length - 1)
                && (bone.positionChannel[idx].time <= posTime)
                && (bone.positionChannel[idx + 1].time <= posTime)
            ) {
                idx++;
            }

            var ratio = (posTime - bone.positionChannel[idx].time) / (bone.positionChannel[idx + 1].time - bone.positionChannel[idx].time);

            pos = Vec3.lerp(bone.positionChannel[idx].position, bone.positionChannel[idx + 1].position, ratio);
        }
        
        // Get orientation compnent...
        if (bone.rotationChannel.length === 1) {
            rot = bone.rotationChannel[0].rotation;
        } else {
            var rotTime = time % bone.rotationChannel[bone.rotationChannel.length - 1].time;
            if (rotTime < 0) rotTime = rotTime + bone.rotationChannel[bone.rotationChannel.length - 1].time;

            var idx = 0;
            while ((idx < bone.rotationChannel.length - 1)
                && (bone.rotationChannel[idx].time <= rotTime)
                && (bone.rotationChannel[idx + 1].time <= rotTime)
            ) {
                idx++;
            }

            var ratio = (rotTime - bone.rotationChannel[idx].time) / (bone.rotationChannel[idx + 1].time - bone.rotationChannel[idx].time);

            rot = Quaternion.slerp(bone.rotationChannel[idx].rotation, bone.rotationChannel[idx + 1].rotation, ratio);
        }

        // Get scale component...
        if (bone.scalingChannel.length === 1) {
            scl = bone.scalingChannel[0].scale;
        } else {
            var sclTime = time % bone.scalingChannel[bone.scalingChannel.length - 1].time;
            if (sclTime < 0) sclTime = sclTime + bone.scalingChannel[bone.scalingChannel.length - 1].time;

            var idx = 0;
            while ((idx < bone.scalingChannel.length - 1)
                && (bone.scalingChannel[idx].time <= sclTime)
                && (bone.scalingChannel[idx + 1].time <= sclTime)
            ) {
                idx++;
            }

            var ratio = (sclTime - bone.scalingChannel[idx].time) / (bone.scalingChannel[idx + 1].time - bone.scalingChannel[idx].time);

            scl = Vec3.lerp(bone.scalingChannel[idx].scale, bone.scalingChannel[idx + 1].scale, ratio);
        }

        return new Mat4().setRotationTranslationScale(rot, pos, scl);
    }
}