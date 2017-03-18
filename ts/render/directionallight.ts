import {Color} from '../math/color';
import {Vec3} from '../math/vec3';

export class DirectionalLight {
    constructor(
        public ambientColor: Color,
        public diffuseColor: Color,
        public direction: Vec3
    ) {}
}