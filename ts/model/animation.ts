import {Mat4} from '../math/mat4';
import {Vec3} from '../math/vec3';
import {Quaternion} from '../math/quaternion';

export class PositionKeyframe {
    constructor (public time: number, public position: Vec3) {}
}

export class RotationKeyframe {
    constructor (public time: number, public rotation: Quaternion) {}
}

export class ScalingKeyframe {
    constructor (public time: number, public scale: Vec3) {}
}

export class AnimatedBone {
    constructor (
        public positionChannel: PositionKeyframe[],
        public rotationChannel: RotationKeyframe[],
        public scalingChannel: ScalingKeyframe[]
    ) {
        this.positionChannel = this.positionChannel.sort((a, b) => a.time - b.time);
        this.rotationChannel = this.rotationChannel.sort((a, b) => a.time - b.time);
        this.scalingChannel = this.scalingChannel.sort((a, b) => a.time - b.time);
    }
}

export class Animation {
    public staticBones: Map<string, { parent?: string, transform: Mat4 }> = new Map();
    public animatedBones: Map<string, AnimatedBone> = new Map();

    constructor (
        public duration: number
    ) {}
}