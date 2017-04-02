// Type definitions for Stats.js r12
// Project: http://github.com/mrdoob/stats.js
// Definitions by: Gregory Dalton <https://github.com/gregolai>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

declare class Stats {

	REVISION: number;

	dom: HTMLDivElement;
	
	// 0: fps, 1: ms
	showPanel(value: number): void;
	
	begin(): void;
	
	end(): number;

	update(): void;

	addPanel(pane: any): any;
	static Panel: any;
}