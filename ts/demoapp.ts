import {Camera} from './model/camera';
import {Vec3} from './math/vec3';
import {Mat4} from './math/mat4';
import {Quaternion} from './math/quaternion';

import {AnimatedEntityProgram} from './render/program/animatedentityprogram';

import {getModelData, getAnimationData, ANIMATIONS} from './model/betacharactermodel';
import {ModelData} from './render/program/animatedentityprogram';
import {Animation} from './model/animation';
import {CreateRandomDancingEntity, Entity} from './model/dancingentity';

import {AnimationManager} from './model/animationmanager';
import {NaiveJSAnimationManager} from './model/naivejsanimationmanager';
import {NaiveWASMAnimationManager} from './model/naivewasmanimationmanager';
import {SpeedyJSAnimationManager} from './model/speedyjsanimationmanager';
import {SpeedyWASMAnimationManager} from './model/speedywasmanimationmanager';

function getParameterByName(name: string, url?: string): string|null {
    if (!url) {
      url = window.location.href;
    }
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

class Demo {
    constructor() {}

    public CreateAndStart(canvas: HTMLCanvasElement) {
        Promise.all([
            getModelData(),
            getAnimationData(ANIMATIONS.RUN),
            getAnimationData(ANIMATIONS.SAMBA),
            getAnimationData(ANIMATIONS.TUT),
            getAnimationData(ANIMATIONS.WAVE)
        ]).then((stuff) => {this.start(canvas, stuff[0], stuff[1], [stuff[2], stuff[3], stuff[4]])});
    }

    protected start(canvas: HTMLCanvasElement, betaModelData: ModelData[], betaRun: Animation, betaDances: Animation[]) {
        console.log('Loaded and starting!');

        let gl = canvas.getContext('webgl');
        if (!gl) {
            return console.error('Could not create WebGL rendering context!');
        }

        //
        // Set up the model
        //
        let camera = new Camera(
            new Vec3(0, 0, -800),
            new Vec3(0, 0, 0),
            new Vec3(0, 1, 0)
        );

        let projMatrix = new Mat4().perspective(
            Math.PI * 0.45,
            gl.drawingBufferWidth / gl.drawingBufferHeight,
            0.1,
            1000.0
        );

        const VELOCITY = 100;
        const START_POS = new Vec3(-500, 0, 0);
        const END_POS = new Vec3(500, 0, 0);
        const DISTANCE_TO_TRAVEL = 1000;

        let animationManagerType: string = getParameterByName('system') || 'default';
        if (['naivejs', 'speedyjs', 'naivewasm', 'speedywasm'].indexOf(animationManagerType) == -1) {
            animationManagerType = 'naivejs';
        }

        let animationManager: AnimationManager;
        switch (animationManagerType)
        {
            case 'speedyjs': animationManager = new SpeedyJSAnimationManager(); break;
            case 'naivewasm': animationManager = new NaiveWASMAnimationManager(); break;
            case 'speedywasm': animationManager = new SpeedyWASMAnimationManager(); break;
            default: animationManager = new NaiveJSAnimationManager();
        }

        const ANIMATION_MANAGER = animationManager;

        // Perform associations...
        betaModelData.forEach((model) => ANIMATION_MANAGER.registerModel(model));
        ANIMATION_MANAGER.registerAnimation(betaRun);
        betaModelData.forEach((model) => ANIMATION_MANAGER.associateModelAndAnimation(betaRun, model));
        betaDances.forEach((dance) => ANIMATION_MANAGER.registerAnimation(dance));
        betaDances.forEach((dance) => betaModelData.forEach((model) => ANIMATION_MANAGER.associateModelAndAnimation(dance, model)));

        let numRunners = parseInt(getParameterByName('numrunners') || '4');
        const NUM_RUNNERS = isNaN(numRunners) ? 4 : numRunners;
        
        let runners: Entity[] = [];
        for (let i = 0; i < numRunners; i++) {
            runners.push(CreateRandomDancingEntity(
                betaRun,
                betaDances,
                ANIMATION_MANAGER,
                DISTANCE_TO_TRAVEL,
                VELOCITY
            ));
        }

        window.addEventListener('resize', () => {
            if (!gl) return; 
            projMatrix = new Mat4().perspective(
                Math.PI * 0.45,
                gl.drawingBufferWidth / gl.drawingBufferHeight,
                0.1,
                1000.0
            );
        });

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