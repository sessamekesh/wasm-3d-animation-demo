import {Color} from '../math/color';

export class Material {
    constructor(
        public ambient: Color,
        public diffuse: Color
    ) {}
}