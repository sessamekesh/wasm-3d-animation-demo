import {Camera} from './model/camera';
import {Vec3} from './math/vec3';
import {Mat4} from './math/mat4';
import {Quaternion} from './math/quaternion';

import {AnimatedEntityProgram} from './render/program/animatedentityprogram';

class Demo {
    constructor() {}

    public CreateAndStart(canvas: HTMLCanvasElement) {
        let gl = canvas.getContext('webgl');
        if (!gl) {
            return console.error('Could not create WebGL rendering context!');
        }

        //
        // Set up the model
        //
        let camera = new Camera(
            new Vec3(0, 10, -10),
            new Vec3(0, 10, 0),
            new Vec3(0, 1, 0)
        );

        //
        // Make the GL resources
        //
        let program = new AnimatedEntityProgram();

        let lastFrame = performance.now();
        let thisFrame: number;
        let dt: number;
        let frame = function () {
            //
            // Timing
            //
            thisFrame = performance.now();
            dt = thisFrame - lastFrame;
            lastFrame = thisFrame;

            //
            // GL resources
            //
            if (!gl) {
                console.warn('Context lost - restoring');
                gl = canvas.getContext('webgl');
                if (!gl) {
                    return console.error('Could not restore WebGL context!');
                }
            }

            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            gl.clearColor(0xd9/255, 0xe9/255, 1, 1);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            //
            // Model Updates
            //
            let projMatrix = new Mat4().perspective(
                Math.PI * 0.45,
                gl.drawingBufferWidth / gl.drawingBufferHeight,
                0.1,
                1000.0
            );

            //
            // Scene Rendering
            //

            requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
    }
};

const DemoApp: Demo = new Demo();

DemoApp.CreateAndStart(document.getElementById('demo-surface') as HTMLCanvasElement);