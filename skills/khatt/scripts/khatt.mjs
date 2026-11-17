#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
// src/core/catalog.ts
var STYLES = [
	{
		id: "ruqaa",
		name: "Ruqʿah",
		nameAr: "رقعة",
		file: "ArefRuqaa-Bold.ttf",
		font: "Aref Ruqaa",
		blurb: "The quick everyday hand: short, slanted, confident."
	},
	{
		id: "naskh",
		name: "Naskh",
		nameAr: "نسخ",
		file: "Amiri-Bold.ttf",
		font: "Amiri",
		blurb: "The classic book hand, rounded and calm."
	},
	{
		id: "kufi",
		name: "Kufic",
		nameAr: "كوفي",
		file: "ReemKufi.ttf",
		font: "Reem Kufi",
		blurb: "Straight lines and angles, the oldest Arabic style."
	},
	{
		id: "nastaliq",
		name: "Nastaʿlīq",
		nameAr: "نستعليق",
		file: "NotoNastaliqUrdu.ttf",
		font: "Noto Nastaliq Urdu",
		blurb: "Hanging words that cascade down to the line."
	},
	{
		id: "kano",
		name: "Kano",
		nameAr: "كانو",
		file: "Alkalami-Regular.ttf",
		font: "Alkalami",
		blurb: "A reed-pen hand from Kano, thick and lively."
	},
	{
		id: "blaka",
		name: "Geometric",
		nameAr: "هندسي",
		file: "Blaka-Regular.ttf",
		font: "Blaka",
		blurb: "Bold geometric shapes, made for logos and posters."
	}
];
var PALETTES = [
	{
		id: "paper",
		name: "Paper",
		nameAr: "ورق",
		bg: "#f3ead7",
		ink: "#1d1a16",
		accent: "#a3302a"
	},
	{
		id: "night",
		name: "Night",
		nameAr: "ليل",
		bg: "#0e1322",
		ink: "#f2e6c4",
		accent: "#d9a441"
	},
	{
		id: "neon",
		name: "Neon",
		nameAr: "نيون",
		bg: "#08070f",
		ink: "#ff4fd8",
		accent: "#3fe7ff"
	},
	{
		id: "zellige",
		name: "Zellige",
		nameAr: "زليج",
		bg: "#f1ece2",
		ink: "#0f5d55",
		accent: "#c4583f"
	},
	{
		id: "desert",
		name: "Desert",
		nameAr: "صحراء",
		bg: "#ecd2a4",
		ink: "#47280f",
		accent: "#b9652a"
	},
	{
		id: "clear",
		name: "Clear",
		nameAr: "شفاف",
		bg: "none",
		ink: "#151515",
		accent: "#c4302b"
	}
];
var styleById = (id) => STYLES.find((s) => s.id === id) ?? STYLES[0];
var paletteById = (id) => PALETTES.find((p) => p.id === id) ?? PALETTES[0];
// src/core/path.ts
var fmt = (n) => {
	const r = Math.round(n * 10) / 10;
	return Object.is(r, -0) ? "0" : String(r);
};
function mapCmds(cmds, f) {
	return cmds.map((c) => {
		const values = [];
		for (let i = 0; i < c.values.length; i += 2) {
			const [x, y] = f(c.values[i], c.values[i + 1]);
			values.push(x, y);
		}
		return {
			type: c.type,
			values
		};
	});
}
function cmdsToD(cmds) {
	let d = "";
	for (const c of cmds) d += c.type + c.values.map(fmt).join(" ");
	return d;
}
function contoursToD(contours) {
	let d = "";
	for (const c of contours) {
		if (c.length < 2) continue;
		d += "M" + fmt(c[0][0]) + " " + fmt(c[0][1]);
		for (let i = 1; i < c.length; i++) d += "L" + fmt(c[i][0]) + " " + fmt(c[i][1]);
		d += "Z";
	}
	return d;
}
var dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
/** Turns curves into polylines. `tol` is the target segment length in user units. */
function flatten(cmds, tol = 2) {
	const out = [];
	let cur = [];
	let x = 0;
	let y = 0;
	const steps = (len) => Math.min(48, Math.max(2, Math.ceil(len / tol)));
	for (const c of cmds) {
		const v = c.values;
		if (c.type === "M") {
			if (cur.length > 1) out.push(cur);
			cur = [[v[0], v[1]]];
			x = v[0];
			y = v[1];
		} else if (c.type === "L") {
			cur.push([v[0], v[1]]);
			x = v[0];
			y = v[1];
		} else if (c.type === "Q") {
			const n = steps(dist(x, y, v[0], v[1]) + dist(v[0], v[1], v[2], v[3]));
			for (let i = 1; i <= n; i++) {
				const t = i / n;
				const a = (1 - t) * (1 - t);
				const b = 2 * (1 - t) * t;
				const e = t * t;
				cur.push([a * x + b * v[0] + e * v[2], a * y + b * v[1] + e * v[3]]);
			}
			x = v[2];
			y = v[3];
		} else if (c.type === "C") {
			const n = steps(dist(x, y, v[0], v[1]) + dist(v[0], v[1], v[2], v[3]) + dist(v[2], v[3], v[4], v[5]));
			for (let i = 1; i <= n; i++) {
				const t = i / n;
				const m = 1 - t;
				const a = m * m * m;
				const b = 3 * m * m * t;
				const e = 3 * m * t * t;
				const f = t * t * t;
				cur.push([a * x + b * v[0] + e * v[2] + f * v[4], a * y + b * v[1] + e * v[3] + f * v[5]]);
			}
			x = v[4];
			y = v[5];
		} else if (c.type === "Z") {
			if (cur.length > 1) out.push(cur);
			cur = [];
		}
	}
	if (cur.length > 1) out.push(cur);
	return out;
}
function emptyBox() {
	return {
		x0: Infinity,
		y0: Infinity,
		x1: -Infinity,
		y1: -Infinity
	};
}
function growBox(b, x, y) {
	if (x < b.x0) b.x0 = x;
	if (y < b.y0) b.y0 = y;
	if (x > b.x1) b.x1 = x;
	if (y > b.y1) b.y1 = y;
}
function contoursBox(contours, into = emptyBox()) {
	for (const c of contours) for (const [x, y] of c) growBox(into, x, y);
	return into;
}
function unionBox(a, b) {
	return {
		x0: Math.min(a.x0, b.x0),
		y0: Math.min(a.y0, b.y0),
		x1: Math.max(a.x1, b.x1),
		y1: Math.max(a.y1, b.y1)
	};
}
/** Non-zero winding test, matching how fonts fill their outlines. */
function inside(contours, x, y) {
	let winding = 0;
	for (const c of contours) for (let i = 0, j = c.length - 1; i < c.length; j = i++) {
		const [xi, yi] = c[i];
		const [xj, yj] = c[j];
		if (yj <= y) {
			if (yi > y && (xi - xj) * (y - yj) - (x - xj) * (yi - yj) > 0) winding++;
		} else if (yi <= y && (xi - xj) * (y - yj) - (x - xj) * (yi - yj) < 0) winding--;
	}
	return winding !== 0;
}
/** Area of the filled shape, estimated on a coarse grid. */
function filledArea(contours, box, cell = 2) {
	let hits = 0;
	for (let y = box.y0 + cell / 2; y < box.y1; y += cell) for (let x = box.x0 + cell / 2; x < box.x1; x += cell) if (inside(contours, x, y)) hits++;
	return hits * cell * cell;
}
/** Random points inside the shape (rejection sampling). */
function samplePoints(contours, box, count, rng) {
	const pts = [];
	const w = box.x1 - box.x0;
	const h = box.y1 - box.y0;
	if (!(w > 0 && h > 0)) return pts;
	for (let tries = 0; pts.length < count && tries < count * 60; tries++) {
		const x = box.x0 + rng() * w;
		const y = box.y0 + rng() * h;
		if (inside(contours, x, y)) pts.push([x, y]);
	}
	return pts;
}
// node_modules/harfbuzzjs/dist/harfbuzz.js
async function createHarfBuzz(moduleArg = {}) {
	var moduleRtn;
	var Module = moduleArg;
	var ENVIRONMENT_IS_WEB = typeof window == "object";
	var ENVIRONMENT_IS_WORKER = typeof WorkerGlobalScope != "undefined";
	var ENVIRONMENT_IS_NODE = typeof process == "object" && process.versions?.node && process.type != "renderer";
	if (ENVIRONMENT_IS_NODE) {
		const { createRequire } = await import("module");
		var require = createRequire(import.meta.url);
	}
	var quit_ = (status, toThrow) => {
		throw toThrow;
	};
	var _scriptName = import.meta.url;
	var scriptDirectory = "";
	function locateFile(path) {
		if (Module["locateFile"]) return Module["locateFile"](path, scriptDirectory);
		return scriptDirectory + path;
	}
	var readAsync, readBinary;
	if (ENVIRONMENT_IS_NODE) {
		var fs = require("fs");
		if (_scriptName.startsWith("file:")) scriptDirectory = require("path").dirname(require("url").fileURLToPath(_scriptName)) + "/";
		readBinary = (filename) => {
			filename = isFileURI(filename) ? new URL(filename) : filename;
			return fs.readFileSync(filename);
		};
		readAsync = async (filename, binary = true) => {
			filename = isFileURI(filename) ? new URL(filename) : filename;
			return fs.readFileSync(filename, binary ? void 0 : "utf8");
		};
		if (process.argv.length > 1) process.argv[1].replace(/\\/g, "/");
		process.argv.slice(2);
		quit_ = (status, toThrow) => {
			process.exitCode = status;
			throw toThrow;
		};
	} else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
		try {
			scriptDirectory = new URL(".", _scriptName).href;
		} catch {}
		if (ENVIRONMENT_IS_WORKER) readBinary = (url) => {
			var xhr = new XMLHttpRequest();
			xhr.open("GET", url, false);
			xhr.responseType = "arraybuffer";
			xhr.send(null);
			return new Uint8Array(xhr.response);
		};
		readAsync = async (url) => {
			if (isFileURI(url)) return new Promise((resolve, reject) => {
				var xhr = new XMLHttpRequest();
				xhr.open("GET", url, true);
				xhr.responseType = "arraybuffer";
				xhr.onload = () => {
					if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
						resolve(xhr.response);
						return;
					}
					reject(xhr.status);
				};
				xhr.onerror = reject;
				xhr.send(null);
			});
			var response = await fetch(url, { credentials: "same-origin" });
			if (response.ok) return response.arrayBuffer();
			throw new Error(response.status + " : " + response.url);
		};
	}
	console.log.bind(console);
	var err = console.error.bind(console);
	var wasmBinary;
	var ABORT = false;
	var EXITSTATUS;
	var isFileURI = (filename) => filename.startsWith("file://");
	var readyPromiseResolve, readyPromiseReject;
	var wasmMemory, HEAPU8;
	var runtimeInitialized = false;
	function updateMemoryViews() {
		var b = wasmMemory.buffer;
		Module["HEAP8"] = new Int8Array(b);
		new Int16Array(b);
		Module["HEAPU8"] = HEAPU8 = new Uint8Array(b);
		Module["HEAPU16"] = new Uint16Array(b);
		Module["HEAP32"] = new Int32Array(b);
		Module["HEAPU32"] = new Uint32Array(b);
		Module["HEAPF32"] = new Float32Array(b);
		new Float64Array(b);
		new BigInt64Array(b);
		new BigUint64Array(b);
	}
	function preRun() {
		if (Module["preRun"]) {
			if (typeof Module["preRun"] == "function") Module["preRun"] = [Module["preRun"]];
			while (Module["preRun"].length) addOnPreRun(Module["preRun"].shift());
		}
		callRuntimeCallbacks(onPreRuns);
	}
	function initRuntime() {
		runtimeInitialized = true;
		wasmExports["__wasm_call_ctors"]();
	}
	function postRun() {
		if (Module["postRun"]) {
			if (typeof Module["postRun"] == "function") Module["postRun"] = [Module["postRun"]];
			while (Module["postRun"].length) addOnPostRun(Module["postRun"].shift());
		}
		callRuntimeCallbacks(onPostRuns);
	}
	var runDependencies = 0;
	var dependenciesFulfilled = null;
	function addRunDependency(id) {
		runDependencies++;
		Module["monitorRunDependencies"]?.(runDependencies);
	}
	function removeRunDependency(id) {
		runDependencies--;
		Module["monitorRunDependencies"]?.(runDependencies);
		if (runDependencies == 0) {
			if (dependenciesFulfilled) {
				var callback = dependenciesFulfilled;
				dependenciesFulfilled = null;
				callback();
			}
		}
	}
	function abort(what) {
		Module["onAbort"]?.(what);
		what = "Aborted(" + what + ")";
		err(what);
		ABORT = true;
		what += ". Build with -sASSERTIONS for more info.";
		var e = new WebAssembly.RuntimeError(what);
		readyPromiseReject?.(e);
		throw e;
	}
	var wasmBinaryFile;
	function findWasmBinary() {
		if (Module["locateFile"]) return locateFile("harfbuzz.wasm");
		return new URL("harfbuzz.wasm", import.meta.url).href;
	}
	function getBinarySync(file) {
		if (file == wasmBinaryFile && wasmBinary) return new Uint8Array(wasmBinary);
		if (readBinary) return readBinary(file);
		throw "both async and sync fetching of the wasm failed";
	}
	async function getWasmBinary(binaryFile) {
		if (!wasmBinary) try {
			var response = await readAsync(binaryFile);
			return new Uint8Array(response);
		} catch {}
		return getBinarySync(binaryFile);
	}
	async function instantiateArrayBuffer(binaryFile, imports) {
		try {
			var binary = await getWasmBinary(binaryFile);
			return await WebAssembly.instantiate(binary, imports);
		} catch (reason) {
			err(`failed to asynchronously prepare wasm: ${reason}`);
			abort(reason);
		}
	}
	async function instantiateAsync(binary, binaryFile, imports) {
		if (!binary && !isFileURI(binaryFile) && !ENVIRONMENT_IS_NODE) try {
			var response = fetch(binaryFile, { credentials: "same-origin" });
			return await WebAssembly.instantiateStreaming(response, imports);
		} catch (reason) {
			err(`wasm streaming compile failed: ${reason}`);
			err("falling back to ArrayBuffer instantiation");
		}
		return instantiateArrayBuffer(binaryFile, imports);
	}
	function getWasmImports() {
		return {
			env: wasmImports,
			wasi_snapshot_preview1: wasmImports
		};
	}
	async function createWasm() {
		function receiveInstance(instance, module) {
			wasmExports = instance.exports;
			Module["wasmExports"] = wasmExports;
			wasmMemory = wasmExports["memory"];
			updateMemoryViews();
			wasmTable = wasmExports["__indirect_function_table"];
			assignWasmExports(wasmExports);
			removeRunDependency("wasm-instantiate");
			return wasmExports;
		}
		addRunDependency("wasm-instantiate");
		function receiveInstantiationResult(result) {
			return receiveInstance(result["instance"]);
		}
		var info = getWasmImports();
		if (Module["instantiateWasm"]) return new Promise((resolve, reject) => {
			Module["instantiateWasm"](info, (mod, inst) => {
				resolve(receiveInstance(mod, inst));
			});
		});
		wasmBinaryFile ??= findWasmBinary();
		return receiveInstantiationResult(await instantiateAsync(wasmBinary, wasmBinaryFile, info));
	}
	class ExitStatus {
		name = "ExitStatus";
		constructor(status) {
			this.message = `Program terminated with exit(${status})`;
			this.status = status;
		}
	}
	var callRuntimeCallbacks = (callbacks) => {
		while (callbacks.length > 0) callbacks.shift()(Module);
	};
	var onPostRuns = [];
	var addOnPostRun = (cb) => onPostRuns.push(cb);
	var onPreRuns = [];
	var addOnPreRun = (cb) => onPreRuns.push(cb);
	var noExitRuntime = true;
	var stackRestore = (val) => __emscripten_stack_restore(val);
	var stackSave = () => _emscripten_stack_get_current();
	var __abort_js = () => abort("");
	var runtimeKeepaliveCounter = 0;
	var __emscripten_runtime_keepalive_clear = () => {
		noExitRuntime = false;
		runtimeKeepaliveCounter = 0;
	};
	var timers = {};
	var handleException = (e) => {
		if (e instanceof ExitStatus || e == "unwind") return EXITSTATUS;
		quit_(1, e);
	};
	var keepRuntimeAlive = () => noExitRuntime || runtimeKeepaliveCounter > 0;
	var _proc_exit = (code) => {
		EXITSTATUS = code;
		if (!keepRuntimeAlive()) {
			Module["onExit"]?.(code);
			ABORT = true;
		}
		quit_(code, new ExitStatus(code));
	};
	var exitJS = (status, implicit) => {
		EXITSTATUS = status;
		_proc_exit(status);
	};
	var _exit = exitJS;
	var maybeExit = () => {
		if (!keepRuntimeAlive()) try {
			_exit(EXITSTATUS);
		} catch (e) {
			handleException(e);
		}
	};
	var callUserCallback = (func) => {
		if (ABORT) return;
		try {
			func();
			maybeExit();
		} catch (e) {
			handleException(e);
		}
	};
	var _emscripten_get_now = () => performance.now();
	var __setitimer_js = (which, timeout_ms) => {
		if (timers[which]) {
			clearTimeout(timers[which].id);
			delete timers[which];
		}
		if (!timeout_ms) return 0;
		timers[which] = {
			id: setTimeout(() => {
				delete timers[which];
				callUserCallback(() => __emscripten_timeout(which, _emscripten_get_now()));
			}, timeout_ms),
			timeout_ms
		};
		return 0;
	};
	var getHeapMax = () => 2147483648;
	var alignMemory = (size, alignment) => Math.ceil(size / alignment) * alignment;
	var growMemory = (size) => {
		var pages = (size - wasmMemory.buffer.byteLength + 65535) / 65536 | 0;
		try {
			wasmMemory.grow(pages);
			updateMemoryViews();
			return 1;
		} catch (e) {}
	};
	var _emscripten_resize_heap = (requestedSize) => {
		var oldSize = HEAPU8.length;
		requestedSize >>>= 0;
		var maxHeapSize = getHeapMax();
		if (requestedSize > maxHeapSize) return false;
		for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
			var overGrownHeapSize = oldSize * (1 + .2 / cutDown);
			overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
			if (growMemory(Math.min(maxHeapSize, alignMemory(Math.max(requestedSize, overGrownHeapSize), 65536)))) return true;
		}
		return false;
	};
	var uleb128EncodeWithLen = (arr) => {
		const n = arr.length;
		return [
			n % 128 | 128,
			n >> 7,
			...arr
		];
	};
	var wasmTypeCodes = {
		i: 127,
		p: 127,
		j: 126,
		f: 125,
		d: 124,
		e: 111
	};
	var generateTypePack = (types) => uleb128EncodeWithLen(Array.from(types, (type) => {
		return wasmTypeCodes[type];
	}));
	var convertJsFunctionToWasm = (func, sig) => {
		var bytes = Uint8Array.of(0, 97, 115, 109, 1, 0, 0, 0, 1, ...uleb128EncodeWithLen([
			1,
			96,
			...generateTypePack(sig.slice(1)),
			...generateTypePack(sig[0] === "v" ? "" : sig[0])
		]), 2, 7, 1, 1, 101, 1, 102, 0, 0, 7, 5, 1, 1, 102, 0, 0);
		var module = new WebAssembly.Module(bytes);
		return new WebAssembly.Instance(module, { e: { f: func } }).exports["f"];
	};
	var wasmTable;
	var getWasmTableEntry = (funcPtr) => wasmTable.get(funcPtr);
	var updateTableMap = (offset, count) => {
		if (functionsInTableMap) for (var i = offset; i < offset + count; i++) {
			var item = getWasmTableEntry(i);
			if (item) functionsInTableMap.set(item, i);
		}
	};
	var functionsInTableMap;
	var getFunctionAddress = (func) => {
		if (!functionsInTableMap) {
			functionsInTableMap = /* @__PURE__ */ new WeakMap();
			updateTableMap(0, wasmTable.length);
		}
		return functionsInTableMap.get(func) || 0;
	};
	var freeTableIndexes = [];
	var getEmptyTableSlot = () => {
		if (freeTableIndexes.length) return freeTableIndexes.pop();
		return wasmTable["grow"](1);
	};
	var setWasmTableEntry = (idx, func) => wasmTable.set(idx, func);
	var addFunction = (func, sig) => {
		var rtn = getFunctionAddress(func);
		if (rtn) return rtn;
		var ret = getEmptyTableSlot();
		try {
			setWasmTableEntry(ret, func);
		} catch (err) {
			if (!(err instanceof TypeError)) throw err;
			setWasmTableEntry(ret, convertJsFunctionToWasm(func, sig));
		}
		functionsInTableMap.set(func, ret);
		return ret;
	};
	var removeFunction = (index) => {
		functionsInTableMap.delete(getWasmTableEntry(index));
		setWasmTableEntry(index, null);
		freeTableIndexes.push(index);
	};
	var stackAlloc = (sz) => __emscripten_stack_alloc(sz);
	if (Module["noExitRuntime"]) noExitRuntime = Module["noExitRuntime"];
	if (Module["print"]) Module["print"];
	if (Module["printErr"]) err = Module["printErr"];
	if (Module["wasmBinary"]) wasmBinary = Module["wasmBinary"];
	if (Module["arguments"]) Module["arguments"];
	if (Module["thisProgram"]) Module["thisProgram"];
	Module["wasmExports"] = wasmExports;
	Module["stackSave"] = stackSave;
	Module["stackRestore"] = stackRestore;
	Module["stackAlloc"] = stackAlloc;
	Module["addFunction"] = addFunction;
	Module["removeFunction"] = removeFunction;
	var __emscripten_timeout, __emscripten_stack_restore, __emscripten_stack_alloc, _emscripten_stack_get_current;
	function assignWasmExports(wasmExports) {
		Module["_hb_blob_create"] = wasmExports["hb_blob_create"];
		Module["_hb_blob_destroy"] = wasmExports["hb_blob_destroy"];
		Module["_hb_blob_get_length"] = wasmExports["hb_blob_get_length"];
		Module["_hb_blob_get_data"] = wasmExports["hb_blob_get_data"];
		Module["_hb_buffer_serialize"] = wasmExports["hb_buffer_serialize"];
		Module["_hb_buffer_create"] = wasmExports["hb_buffer_create"];
		Module["_hb_buffer_reset"] = wasmExports["hb_buffer_reset"];
		Module["_hb_buffer_reference"] = wasmExports["hb_buffer_reference"];
		Module["_hb_buffer_destroy"] = wasmExports["hb_buffer_destroy"];
		Module["_hb_buffer_get_content_type"] = wasmExports["hb_buffer_get_content_type"];
		Module["_hb_buffer_set_direction"] = wasmExports["hb_buffer_set_direction"];
		Module["_hb_buffer_set_script"] = wasmExports["hb_buffer_set_script"];
		Module["_hb_buffer_set_language"] = wasmExports["hb_buffer_set_language"];
		Module["_hb_buffer_set_flags"] = wasmExports["hb_buffer_set_flags"];
		Module["_hb_buffer_set_cluster_level"] = wasmExports["hb_buffer_set_cluster_level"];
		Module["_hb_buffer_clear_contents"] = wasmExports["hb_buffer_clear_contents"];
		Module["_hb_buffer_add"] = wasmExports["hb_buffer_add"];
		Module["_hb_buffer_get_length"] = wasmExports["hb_buffer_get_length"];
		Module["_hb_buffer_get_glyph_infos"] = wasmExports["hb_buffer_get_glyph_infos"];
		Module["_hb_buffer_get_glyph_positions"] = wasmExports["hb_buffer_get_glyph_positions"];
		Module["_hb_glyph_info_get_glyph_flags"] = wasmExports["hb_glyph_info_get_glyph_flags"];
		Module["_hb_buffer_guess_segment_properties"] = wasmExports["hb_buffer_guess_segment_properties"];
		Module["_hb_buffer_add_utf8"] = wasmExports["hb_buffer_add_utf8"];
		Module["_hb_buffer_add_utf16"] = wasmExports["hb_buffer_add_utf16"];
		Module["_hb_buffer_add_codepoints"] = wasmExports["hb_buffer_add_codepoints"];
		Module["_hb_buffer_set_message_func"] = wasmExports["hb_buffer_set_message_func"];
		Module["_hb_language_from_string"] = wasmExports["hb_language_from_string"];
		Module["_hb_language_to_string"] = wasmExports["hb_language_to_string"];
		Module["_hb_script_from_string"] = wasmExports["hb_script_from_string"];
		Module["_hb_version"] = wasmExports["hb_version"];
		Module["_hb_version_string"] = wasmExports["hb_version_string"];
		Module["_hb_feature_from_string"] = wasmExports["hb_feature_from_string"];
		Module["_hb_feature_to_string"] = wasmExports["hb_feature_to_string"];
		Module["_hb_variation_from_string"] = wasmExports["hb_variation_from_string"];
		Module["_hb_variation_to_string"] = wasmExports["hb_variation_to_string"];
		Module["_malloc"] = wasmExports["malloc"];
		Module["_free"] = wasmExports["free"];
		Module["_hb_draw_funcs_set_move_to_func"] = wasmExports["hb_draw_funcs_set_move_to_func"];
		Module["_hb_draw_funcs_set_line_to_func"] = wasmExports["hb_draw_funcs_set_line_to_func"];
		Module["_hb_draw_funcs_set_quadratic_to_func"] = wasmExports["hb_draw_funcs_set_quadratic_to_func"];
		Module["_hb_draw_funcs_set_cubic_to_func"] = wasmExports["hb_draw_funcs_set_cubic_to_func"];
		Module["_hb_draw_funcs_set_close_path_func"] = wasmExports["hb_draw_funcs_set_close_path_func"];
		Module["_hb_draw_funcs_create"] = wasmExports["hb_draw_funcs_create"];
		Module["_hb_draw_funcs_destroy"] = wasmExports["hb_draw_funcs_destroy"];
		Module["_hb_face_create"] = wasmExports["hb_face_create"];
		Module["_hb_face_reference"] = wasmExports["hb_face_reference"];
		Module["_hb_face_destroy"] = wasmExports["hb_face_destroy"];
		Module["_hb_face_reference_table"] = wasmExports["hb_face_reference_table"];
		Module["_hb_face_get_upem"] = wasmExports["hb_face_get_upem"];
		Module["_hb_face_collect_unicodes"] = wasmExports["hb_face_collect_unicodes"];
		Module["_hb_font_funcs_create"] = wasmExports["hb_font_funcs_create"];
		Module["_hb_font_funcs_destroy"] = wasmExports["hb_font_funcs_destroy"];
		Module["_hb_font_funcs_set_font_h_extents_func"] = wasmExports["hb_font_funcs_set_font_h_extents_func"];
		Module["_hb_font_funcs_set_font_v_extents_func"] = wasmExports["hb_font_funcs_set_font_v_extents_func"];
		Module["_hb_font_funcs_set_nominal_glyph_func"] = wasmExports["hb_font_funcs_set_nominal_glyph_func"];
		Module["_hb_font_funcs_set_nominal_glyphs_func"] = wasmExports["hb_font_funcs_set_nominal_glyphs_func"];
		Module["_hb_font_funcs_set_variation_glyph_func"] = wasmExports["hb_font_funcs_set_variation_glyph_func"];
		Module["_hb_font_funcs_set_glyph_h_advance_func"] = wasmExports["hb_font_funcs_set_glyph_h_advance_func"];
		Module["_hb_font_funcs_set_glyph_v_advance_func"] = wasmExports["hb_font_funcs_set_glyph_v_advance_func"];
		Module["_hb_font_funcs_set_glyph_h_advances_func"] = wasmExports["hb_font_funcs_set_glyph_h_advances_func"];
		Module["_hb_font_funcs_set_glyph_v_advances_func"] = wasmExports["hb_font_funcs_set_glyph_v_advances_func"];
		Module["_hb_font_funcs_set_glyph_h_origin_func"] = wasmExports["hb_font_funcs_set_glyph_h_origin_func"];
		Module["_hb_font_funcs_set_glyph_v_origin_func"] = wasmExports["hb_font_funcs_set_glyph_v_origin_func"];
		Module["_hb_font_funcs_set_glyph_h_kerning_func"] = wasmExports["hb_font_funcs_set_glyph_h_kerning_func"];
		Module["_hb_font_funcs_set_glyph_extents_func"] = wasmExports["hb_font_funcs_set_glyph_extents_func"];
		Module["_hb_font_funcs_set_glyph_name_func"] = wasmExports["hb_font_funcs_set_glyph_name_func"];
		Module["_hb_font_funcs_set_glyph_from_name_func"] = wasmExports["hb_font_funcs_set_glyph_from_name_func"];
		Module["_hb_font_get_h_extents"] = wasmExports["hb_font_get_h_extents"];
		Module["_hb_font_get_v_extents"] = wasmExports["hb_font_get_v_extents"];
		Module["_hb_font_get_glyph"] = wasmExports["hb_font_get_glyph"];
		Module["_hb_font_get_nominal_glyph"] = wasmExports["hb_font_get_nominal_glyph"];
		Module["_hb_font_get_variation_glyph"] = wasmExports["hb_font_get_variation_glyph"];
		Module["_hb_font_get_glyph_h_advance"] = wasmExports["hb_font_get_glyph_h_advance"];
		Module["_hb_font_get_glyph_v_advance"] = wasmExports["hb_font_get_glyph_v_advance"];
		Module["_hb_font_get_glyph_h_origin"] = wasmExports["hb_font_get_glyph_h_origin"];
		Module["_hb_font_get_glyph_v_origin"] = wasmExports["hb_font_get_glyph_v_origin"];
		Module["_hb_font_get_glyph_extents"] = wasmExports["hb_font_get_glyph_extents"];
		Module["_hb_font_get_glyph_from_name"] = wasmExports["hb_font_get_glyph_from_name"];
		Module["_hb_font_draw_glyph_or_fail"] = wasmExports["hb_font_draw_glyph_or_fail"];
		Module["_hb_font_paint_glyph_or_fail"] = wasmExports["hb_font_paint_glyph_or_fail"];
		Module["_hb_font_draw_glyph"] = wasmExports["hb_font_draw_glyph"];
		Module["_hb_font_paint_glyph"] = wasmExports["hb_font_paint_glyph"];
		Module["_hb_font_glyph_to_string"] = wasmExports["hb_font_glyph_to_string"];
		Module["_hb_font_create"] = wasmExports["hb_font_create"];
		Module["_hb_font_set_variations"] = wasmExports["hb_font_set_variations"];
		Module["_hb_font_create_sub_font"] = wasmExports["hb_font_create_sub_font"];
		Module["_hb_font_reference"] = wasmExports["hb_font_reference"];
		Module["_hb_font_destroy"] = wasmExports["hb_font_destroy"];
		Module["_hb_font_get_face"] = wasmExports["hb_font_get_face"];
		Module["_hb_font_set_funcs"] = wasmExports["hb_font_set_funcs"];
		Module["_hb_font_set_scale"] = wasmExports["hb_font_set_scale"];
		Module["_hb_ot_color_has_palettes"] = wasmExports["hb_ot_color_has_palettes"];
		Module["_hb_ot_color_palette_get_count"] = wasmExports["hb_ot_color_palette_get_count"];
		Module["_hb_ot_color_palette_get_name_id"] = wasmExports["hb_ot_color_palette_get_name_id"];
		Module["_hb_ot_color_palette_color_get_name_id"] = wasmExports["hb_ot_color_palette_color_get_name_id"];
		Module["_hb_ot_color_palette_get_flags"] = wasmExports["hb_ot_color_palette_get_flags"];
		Module["_hb_ot_color_palette_get_colors"] = wasmExports["hb_ot_color_palette_get_colors"];
		Module["_hb_ot_color_has_layers"] = wasmExports["hb_ot_color_has_layers"];
		Module["_hb_ot_color_has_paint"] = wasmExports["hb_ot_color_has_paint"];
		Module["_hb_ot_color_glyph_has_paint"] = wasmExports["hb_ot_color_glyph_has_paint"];
		Module["_hb_ot_color_glyph_get_layers"] = wasmExports["hb_ot_color_glyph_get_layers"];
		Module["_hb_ot_color_has_png"] = wasmExports["hb_ot_color_has_png"];
		Module["_hb_ot_color_glyph_reference_png"] = wasmExports["hb_ot_color_glyph_reference_png"];
		Module["_hb_ot_layout_get_glyph_class"] = wasmExports["hb_ot_layout_get_glyph_class"];
		Module["_hb_ot_layout_get_ligature_carets"] = wasmExports["hb_ot_layout_get_ligature_carets"];
		Module["_hb_ot_layout_table_get_script_tags"] = wasmExports["hb_ot_layout_table_get_script_tags"];
		Module["_hb_ot_layout_table_get_feature_tags"] = wasmExports["hb_ot_layout_table_get_feature_tags"];
		Module["_hb_ot_layout_script_get_language_tags"] = wasmExports["hb_ot_layout_script_get_language_tags"];
		Module["_hb_ot_layout_language_get_feature_tags"] = wasmExports["hb_ot_layout_language_get_feature_tags"];
		Module["_hb_ot_layout_feature_get_lookups"] = wasmExports["hb_ot_layout_feature_get_lookups"];
		Module["_hb_ot_layout_feature_get_name_ids"] = wasmExports["hb_ot_layout_feature_get_name_ids"];
		Module["_hb_ot_metrics_get_position_with_fallback"] = wasmExports["hb_ot_metrics_get_position_with_fallback"];
		Module["_hb_ot_layout_lookup_get_optical_bound"] = wasmExports["hb_ot_layout_lookup_get_optical_bound"];
		Module["_hb_ot_tags_from_script_and_language"] = wasmExports["hb_ot_tags_from_script_and_language"];
		Module["_hb_ot_metrics_get_position"] = wasmExports["hb_ot_metrics_get_position"];
		Module["_hb_ot_metrics_get_variation"] = wasmExports["hb_ot_metrics_get_variation"];
		Module["_hb_ot_metrics_get_x_variation"] = wasmExports["hb_ot_metrics_get_x_variation"];
		Module["_hb_ot_metrics_get_y_variation"] = wasmExports["hb_ot_metrics_get_y_variation"];
		Module["_hb_ot_name_list_names"] = wasmExports["hb_ot_name_list_names"];
		Module["_hb_ot_name_get_utf16"] = wasmExports["hb_ot_name_get_utf16"];
		Module["_hb_set_create"] = wasmExports["hb_set_create"];
		Module["_hb_set_destroy"] = wasmExports["hb_set_destroy"];
		Module["_hb_ot_tag_to_script"] = wasmExports["hb_ot_tag_to_script"];
		Module["_hb_ot_tag_to_language"] = wasmExports["hb_ot_tag_to_language"];
		Module["_hb_ot_tags_to_script_and_language"] = wasmExports["hb_ot_tags_to_script_and_language"];
		Module["_hb_ot_var_get_axis_infos"] = wasmExports["hb_ot_var_get_axis_infos"];
		Module["_hb_paint_funcs_set_push_transform_func"] = wasmExports["hb_paint_funcs_set_push_transform_func"];
		Module["_hb_paint_funcs_set_pop_transform_func"] = wasmExports["hb_paint_funcs_set_pop_transform_func"];
		Module["_hb_paint_funcs_set_color_glyph_func"] = wasmExports["hb_paint_funcs_set_color_glyph_func"];
		Module["_hb_paint_funcs_set_push_clip_glyph_func"] = wasmExports["hb_paint_funcs_set_push_clip_glyph_func"];
		Module["_hb_paint_funcs_set_push_clip_rectangle_func"] = wasmExports["hb_paint_funcs_set_push_clip_rectangle_func"];
		Module["_hb_paint_funcs_set_pop_clip_func"] = wasmExports["hb_paint_funcs_set_pop_clip_func"];
		Module["_hb_paint_funcs_set_color_func"] = wasmExports["hb_paint_funcs_set_color_func"];
		Module["_hb_paint_funcs_set_image_func"] = wasmExports["hb_paint_funcs_set_image_func"];
		Module["_hb_paint_funcs_set_linear_gradient_func"] = wasmExports["hb_paint_funcs_set_linear_gradient_func"];
		Module["_hb_paint_funcs_set_radial_gradient_func"] = wasmExports["hb_paint_funcs_set_radial_gradient_func"];
		Module["_hb_paint_funcs_set_sweep_gradient_func"] = wasmExports["hb_paint_funcs_set_sweep_gradient_func"];
		Module["_hb_paint_funcs_set_push_group_func"] = wasmExports["hb_paint_funcs_set_push_group_func"];
		Module["_hb_paint_funcs_set_pop_group_func"] = wasmExports["hb_paint_funcs_set_pop_group_func"];
		Module["_hb_paint_funcs_set_custom_palette_color_func"] = wasmExports["hb_paint_funcs_set_custom_palette_color_func"];
		Module["_hb_paint_funcs_create"] = wasmExports["hb_paint_funcs_create"];
		Module["_hb_paint_funcs_destroy"] = wasmExports["hb_paint_funcs_destroy"];
		Module["_hb_color_line_get_color_stops"] = wasmExports["hb_color_line_get_color_stops"];
		Module["_hb_color_line_get_extend"] = wasmExports["hb_color_line_get_extend"];
		Module["_hb_set_get_population"] = wasmExports["hb_set_get_population"];
		Module["_hb_set_next_many"] = wasmExports["hb_set_next_many"];
		Module["_hb_shape"] = wasmExports["hb_shape"];
		__emscripten_timeout = wasmExports["_emscripten_timeout"];
		__emscripten_stack_restore = wasmExports["_emscripten_stack_restore"];
		__emscripten_stack_alloc = wasmExports["_emscripten_stack_alloc"];
		_emscripten_stack_get_current = wasmExports["emscripten_stack_get_current"];
	}
	var wasmImports = {
		_abort_js: __abort_js,
		_emscripten_runtime_keepalive_clear: __emscripten_runtime_keepalive_clear,
		_setitimer_js: __setitimer_js,
		emscripten_resize_heap: _emscripten_resize_heap,
		proc_exit: _proc_exit
	};
	var wasmExports = await createWasm();
	function run() {
		if (runDependencies > 0) {
			dependenciesFulfilled = run;
			return;
		}
		preRun();
		if (runDependencies > 0) {
			dependenciesFulfilled = run;
			return;
		}
		function doRun() {
			Module["calledRun"] = true;
			if (ABORT) return;
			initRuntime();
			readyPromiseResolve?.(Module);
			Module["onRuntimeInitialized"]?.();
			postRun();
		}
		if (Module["setStatus"]) {
			Module["setStatus"]("Running...");
			setTimeout(() => {
				setTimeout(() => Module["setStatus"](""), 1);
				doRun();
			}, 1);
		} else doRun();
	}
	function preInit() {
		if (Module["preInit"]) {
			if (typeof Module["preInit"] == "function") Module["preInit"] = [Module["preInit"]];
			while (Module["preInit"].length > 0) Module["preInit"].shift()();
		}
	}
	preInit();
	run();
	if (runtimeInitialized) moduleRtn = Module;
	else moduleRtn = new Promise((resolve, reject) => {
		readyPromiseResolve = resolve;
		readyPromiseReject = reject;
	});
	return moduleRtn;
}
// node_modules/harfbuzzjs/dist/index.mjs
var Module;
var exports;
var freeFuncPtr;
var utf8Decoder = new TextDecoder("utf8");
var utf8Encoder = new TextEncoder();
var registry = new FinalizationRegistry((cleanup) => {
	cleanup();
});
function track(obj, destroy) {
	const ptr = obj.ptr;
	registry.register(obj, () => destroy(ptr));
}
/**
* Initialize the HarfBuzz module.
* @param module The Emscripten module instance created with {@link
* createHarfBuzz}.
*/
function init(module) {
	Module = module;
	exports = Module.wasmExports;
	freeFuncPtr = Module.addFunction((ptr) => {
		exports.free(ptr);
	}, "vi");
}
function hb_tag(s) {
	return (s.charCodeAt(0) & 255) << 24 | (s.charCodeAt(1) & 255) << 16 | (s.charCodeAt(2) & 255) << 8 | (s.charCodeAt(3) & 255) << 0;
}
function hb_untag(tag) {
	return String.fromCharCode(tag >> 24 & 255, tag >> 16 & 255, tag >> 8 & 255, tag >> 0 & 255);
}
function utf8_ptr_to_string(ptr, length) {
	let end;
	if (length == void 0) end = Module.HEAPU8.indexOf(0, ptr);
	else end = ptr + length;
	return utf8Decoder.decode(Module.HEAPU8.subarray(ptr, end));
}
function utf16_ptr_to_string(ptr, length) {
	const end = ptr / 2 + length;
	return String.fromCharCode(...Module.HEAPU16.subarray(ptr / 2, end));
}
/**
* Use when you know the input range should be ASCII.
* Faster than encoding to UTF-8
*/
function string_to_ascii_ptr(text) {
	const ptr = exports.malloc(text.length + 1);
	for (let i = 0; i < text.length; ++i) {
		const char = text.charCodeAt(i);
		if (char > 127) throw new Error("Expected ASCII text");
		Module.HEAPU8[ptr + i] = char;
	}
	Module.HEAPU8[ptr + text.length] = 0;
	return {
		ptr,
		length: text.length,
		free: function() {
			exports.free(ptr);
		}
	};
}
function string_to_utf8_ptr(text) {
	const ptr = exports.malloc(text.length);
	utf8Encoder.encodeInto(text, Module.HEAPU8.subarray(ptr, ptr + text.length));
	return {
		ptr,
		length: text.length,
		free: function() {
			exports.free(ptr);
		}
	};
}
function string_to_utf16_ptr(text) {
	const ptr = exports.malloc(text.length * 2);
	const words = Module.HEAPU16.subarray(ptr / 2, ptr / 2 + text.length);
	for (let i = 0; i < words.length; ++i) words[i] = text.charCodeAt(i);
	return {
		ptr,
		length: words.length,
		free: function() {
			exports.free(ptr);
		}
	};
}
function language_to_string(language) {
	return utf8_ptr_to_string(exports.hb_language_to_string(language));
}
function language_from_string(str) {
	const languageStr = string_to_ascii_ptr(str);
	const languagePtr = exports.hb_language_from_string(languageStr.ptr, -1);
	languageStr.free();
	return languagePtr;
}
/**
* Return the typed array of HarfBuzz set contents.
* @param setPtr Pointer of set
* @returns Typed array instance
*/
function typed_array_from_set(setPtr) {
	const setCount = exports.hb_set_get_population(setPtr);
	const arrayPtr = exports.malloc(setCount << 2);
	const arrayOffset = arrayPtr >> 2;
	exports.hb_set_next_many(setPtr, -1, arrayPtr, setCount);
	return Module.HEAPU32.subarray(arrayOffset, arrayOffset + setCount);
}
var callbackData = [void 0];
var freeCallbackData = [];
function register_callback_data_pointer(data) {
	if (data === void 0) return 0;
	const dataPtr = freeCallbackData.pop() ?? callbackData.length;
	callbackData[dataPtr] = data;
	return dataPtr;
}
function get_callback_data(dataPtr) {
	return callbackData[dataPtr];
}
function remove_callback_data_pointer(dataPtr) {
	if (dataPtr === 0) return;
	callbackData[dataPtr] = void 0;
	freeCallbackData.push(dataPtr);
}
function color_from_int(color) {
	return {
		red: color >> 8 & 255,
		green: color >> 16 & 255,
		blue: color >> 24 & 255,
		alpha: color & 255
	};
}
function color_to_int(color) {
	return (color.red << 8 | color.green << 16 | color.blue << 24 | color.alpha) >>> 0;
}
/**
* An object representing a {@link https://harfbuzz.github.io/harfbuzz-hb-blob.html | HarfBuzz blob}.
* A blob wraps a chunk of binary data, typically the contents of a font file.
*/
var Blob = class {
	/**
	* @param data Binary font data.
	*/
	constructor(data) {
		const array = data instanceof Uint8Array ? data : new Uint8Array(data);
		const blobPtr = exports.malloc(array.byteLength);
		Module.HEAPU8.set(array, blobPtr);
		this.ptr = exports.hb_blob_create(blobPtr, array.byteLength, 2, blobPtr, freeFuncPtr);
		track(this, exports.hb_blob_destroy);
	}
};
var HB_OT_NAME_ID_INVALID = 65535;
/**
* An object representing a {@link https://harfbuzz.github.io/harfbuzz-hb-face.html | HarfBuzz face}.
* A face represents a single face in a binary font file and is the
* foundation for creating Font objects used in text shaping.
*/
var Face = class {
	constructor(arg, index = 0) {
		if (typeof arg === "number") this.ptr = exports.hb_face_reference(arg);
		else this.ptr = exports.hb_face_create(arg.ptr, index);
		this.upem = exports.hb_face_get_upem(this.ptr);
		track(this, exports.hb_face_destroy);
	}
	/**
	* Return the binary contents of an OpenType table.
	* @param table Table name
	* @returns A Uint8Array of the table data, or undefined if the table is not found.
	*/
	referenceTable(table) {
		const blob = exports.hb_face_reference_table(this.ptr, hb_tag(table));
		const length = exports.hb_blob_get_length(blob);
		if (!length) return;
		const blobptr = exports.hb_blob_get_data(blob, 0);
		return Module.HEAPU8.subarray(blobptr, blobptr + length);
	}
	/**
	* Return variation axis infos.
	* @returns A dictionary mapping axis tags to {@link AxisInfo} values.
	*/
	getAxisInfos() {
		const sp = Module.stackSave();
		const axis = Module.stackAlloc(2048);
		const c = Module.stackAlloc(4);
		Module.HEAPU32[c / 4] = 64;
		exports.hb_ot_var_get_axis_infos(this.ptr, 0, c, axis);
		const result = {};
		Array.from({ length: Module.HEAPU32[c / 4] }).forEach((_, i) => {
			const info = {
				axisIndex: Module.HEAPU32[axis / 4 + i * 8],
				tag: hb_untag(Module.HEAPU32[axis / 4 + i * 8 + 1]),
				nameId: Module.HEAPU32[axis / 4 + i * 8 + 2],
				flags: Module.HEAPU32[axis / 4 + i * 8 + 3],
				min: Module.HEAPF32[axis / 4 + i * 8 + 4],
				default: Module.HEAPF32[axis / 4 + i * 8 + 5],
				max: Module.HEAPF32[axis / 4 + i * 8 + 6]
			};
			result[info.tag] = info;
		});
		Module.stackRestore(sp);
		return result;
	}
	/**
	* Return unicodes the face supports.
	* @returns A Uint32Array of supported Unicode code points.
	*/
	collectUnicodes() {
		const unicodeSetPtr = exports.hb_set_create();
		exports.hb_face_collect_unicodes(this.ptr, unicodeSetPtr);
		const result = typed_array_from_set(unicodeSetPtr);
		exports.hb_set_destroy(unicodeSetPtr);
		return result;
	}
	/**
	* Return all scripts enumerated in the specified face's
	* GSUB table or GPOS table.
	* @param table The table to query, either "GSUB" or "GPOS".
	* @returns An array of 4-character script tag strings.
	*/
	getTableScriptTags(table) {
		const sp = Module.stackSave();
		const tableTag = hb_tag(table);
		let startOffset = 0;
		let scriptCount = 128;
		const scriptCountPtr = Module.stackAlloc(4);
		const scriptTagsPtr = Module.stackAlloc(512);
		const tags = [];
		while (scriptCount == 128) {
			Module.HEAPU32[scriptCountPtr / 4] = scriptCount;
			exports.hb_ot_layout_table_get_script_tags(this.ptr, tableTag, startOffset, scriptCountPtr, scriptTagsPtr);
			scriptCount = Module.HEAPU32[scriptCountPtr / 4];
			const scriptTags = Module.HEAPU32.subarray(scriptTagsPtr / 4, scriptTagsPtr / 4 + scriptCount);
			tags.push(...Array.from(scriptTags).map(hb_untag));
			startOffset += scriptCount;
		}
		Module.stackRestore(sp);
		return tags;
	}
	/**
	* Return all features enumerated in the specified face's
	* GSUB table or GPOS table.
	* @param table The table to query, either "GSUB" or "GPOS".
	* @returns An array of 4-character feature tag strings.
	*/
	getTableFeatureTags(table) {
		const sp = Module.stackSave();
		const tableTag = hb_tag(table);
		let startOffset = 0;
		let featureCount = 128;
		const featureCountPtr = Module.stackAlloc(4);
		const featureTagsPtr = Module.stackAlloc(512);
		const tags = [];
		while (featureCount == 128) {
			Module.HEAPU32[featureCountPtr / 4] = featureCount;
			exports.hb_ot_layout_table_get_feature_tags(this.ptr, tableTag, startOffset, featureCountPtr, featureTagsPtr);
			featureCount = Module.HEAPU32[featureCountPtr / 4];
			const featureTags = Module.HEAPU32.subarray(featureTagsPtr / 4, featureTagsPtr / 4 + featureCount);
			tags.push(...Array.from(featureTags).map(hb_untag));
			startOffset += featureCount;
		}
		Module.stackRestore(sp);
		return tags;
	}
	/**
	* Return language tags in the given face's GSUB or GPOS table, underneath
	* the specified script index.
	* @param table The table to query, either "GSUB" or "GPOS".
	* @param scriptIndex The index of the script to query.
	* @returns An array of 4-character language tag strings.
	*/
	getScriptLanguageTags(table, scriptIndex) {
		const sp = Module.stackSave();
		const tableTag = hb_tag(table);
		let startOffset = 0;
		let languageCount = 128;
		const languageCountPtr = Module.stackAlloc(4);
		const languageTagsPtr = Module.stackAlloc(512);
		const tags = [];
		while (languageCount == 128) {
			Module.HEAPU32[languageCountPtr / 4] = languageCount;
			exports.hb_ot_layout_script_get_language_tags(this.ptr, tableTag, scriptIndex, startOffset, languageCountPtr, languageTagsPtr);
			languageCount = Module.HEAPU32[languageCountPtr / 4];
			const languageTags = Module.HEAPU32.subarray(languageTagsPtr / 4, languageTagsPtr / 4 + languageCount);
			tags.push(...Array.from(languageTags).map(hb_untag));
			startOffset += languageCount;
		}
		Module.stackRestore(sp);
		return tags;
	}
	/**
	* Return all features in the specified face's GSUB table or GPOS table,
	* underneath the specified script and language.
	* @param table The table to query, either "GSUB" or "GPOS".
	* @param scriptIndex The index of the script to query.
	* @param languageIndex The index of the language to query.
	* @returns An array of 4-character feature tag strings.
	*/
	getLanguageFeatureTags(table, scriptIndex, languageIndex) {
		const sp = Module.stackSave();
		const tableTag = hb_tag(table);
		let startOffset = 0;
		let featureCount = 128;
		const featureCountPtr = Module.stackAlloc(4);
		const featureTagsPtr = Module.stackAlloc(512);
		const tags = [];
		while (featureCount == 128) {
			Module.HEAPU32[featureCountPtr / 4] = featureCount;
			exports.hb_ot_layout_language_get_feature_tags(this.ptr, tableTag, scriptIndex, languageIndex, startOffset, featureCountPtr, featureTagsPtr);
			featureCount = Module.HEAPU32[featureCountPtr / 4];
			const featureTags = Module.HEAPU32.subarray(featureTagsPtr / 4, featureTagsPtr / 4 + featureCount);
			tags.push(...Array.from(featureTags).map(hb_untag));
			startOffset += featureCount;
		}
		Module.stackRestore(sp);
		return tags;
	}
	/**
	* Fetches a list of all lookups enumerated for the specified feature, in
	* the specified face's GSUB table or GPOS table.
	* @param table The table to query, either "GSUB" or "GPOS".
	* @param featureIndex The index of the requested feature.
	* @returns An array of lookup indexes.
	*/
	getFeatureLookups(table, featureIndex) {
		const sp = Module.stackSave();
		const tableTag = hb_tag(table);
		let startOffset = 0;
		let lookupCount = 128;
		const lookupCountPtr = Module.stackAlloc(4);
		const lookupIndexesPtr = Module.stackAlloc(512);
		const lookups = [];
		while (lookupCount == 128) {
			Module.HEAPU32[lookupCountPtr / 4] = lookupCount;
			exports.hb_ot_layout_feature_get_lookups(this.ptr, tableTag, featureIndex, startOffset, lookupCountPtr, lookupIndexesPtr);
			lookupCount = Module.HEAPU32[lookupCountPtr / 4];
			const lookupIndexes = Module.HEAPU32.subarray(lookupIndexesPtr / 4, lookupIndexesPtr / 4 + lookupCount);
			lookups.push(...Array.from(lookupIndexes));
			startOffset += lookupCount;
		}
		Module.stackRestore(sp);
		return lookups;
	}
	/**
	* Get the GDEF class of the requested glyph.
	* @param glyph The glyph to get the class of.
	* @returns The {@link GlyphClass} of the glyph.
	*/
	getGlyphClass(glyph) {
		return exports.hb_ot_layout_get_glyph_class(this.ptr, glyph);
	}
	/**
	* Return all names in the specified face's name table.
	* @returns An array of {nameId, language} entries.
	*/
	listNames() {
		const sp = Module.stackSave();
		const numEntriesPtr = Module.stackAlloc(4);
		const entriesPtr = exports.hb_ot_name_list_names(this.ptr, numEntriesPtr);
		const numEntries = Module.HEAPU32[numEntriesPtr / 4];
		const entries = [];
		for (let i = 0; i < numEntries; i++) entries.push({
			nameId: Module.HEAPU32[entriesPtr / 4 + i * 3],
			language: language_to_string(Module.HEAPU32[entriesPtr / 4 + i * 3 + 2])
		});
		Module.stackRestore(sp);
		return entries;
	}
	/**
	* Get the name of the specified face.
	* @param nameId The ID of the name to get.
	* @param language The language of the name to get.
	* @returns The name string.
	*/
	getName(nameId, language) {
		const sp = Module.stackSave();
		const languagePtr = language_from_string(language);
		const nameLen = exports.hb_ot_name_get_utf16(this.ptr, nameId, languagePtr, 0, 0) + 1;
		const textSizePtr = Module.stackAlloc(4);
		const textPtr = exports.malloc(nameLen * 2);
		Module.HEAPU32[textSizePtr / 4] = nameLen;
		exports.hb_ot_name_get_utf16(this.ptr, nameId, languagePtr, textSizePtr, textPtr);
		const name = utf16_ptr_to_string(textPtr, nameLen - 1);
		exports.free(textPtr);
		Module.stackRestore(sp);
		return name;
	}
	/**
	* Get the name IDs of the specified feature.
	* @param table The table to query, either "GSUB" or "GPOS".
	* @param featureIndex The index of the feature to query.
	* @returns An object with name IDs, or undefined if not found.
	*/
	getFeatureNameIds(table, featureIndex) {
		const sp = Module.stackSave();
		const tableTag = hb_tag(table);
		const labelIdPtr = Module.stackAlloc(4);
		const tooltipIdPtr = Module.stackAlloc(4);
		const sampleIdPtr = Module.stackAlloc(4);
		const numNamedParametersPtr = Module.stackAlloc(4);
		const firstParameterIdPtr = Module.stackAlloc(4);
		const found = exports.hb_ot_layout_feature_get_name_ids(this.ptr, tableTag, featureIndex, labelIdPtr, tooltipIdPtr, sampleIdPtr, numNamedParametersPtr, firstParameterIdPtr);
		let names;
		if (found) {
			const uiLabelNameId = Module.HEAPU32[labelIdPtr / 4];
			const uiTooltipTextNameId = Module.HEAPU32[tooltipIdPtr / 4];
			const sampleTextNameId = Module.HEAPU32[sampleIdPtr / 4];
			const numNamedParameters = Module.HEAPU32[numNamedParametersPtr / 4];
			const firstParameterId = Module.HEAPU32[firstParameterIdPtr / 4];
			names = { paramUiLabelNameIds: Array.from({ length: numNamedParameters }, (_, i) => firstParameterId + i) };
			if (uiLabelNameId != HB_OT_NAME_ID_INVALID) names.uiLabelNameId = uiLabelNameId;
			if (uiTooltipTextNameId != HB_OT_NAME_ID_INVALID) names.uiTooltipTextNameId = uiTooltipTextNameId;
			if (sampleTextNameId != HB_OT_NAME_ID_INVALID) names.sampleTextNameId = sampleTextNameId;
		}
		Module.stackRestore(sp);
		return names;
	}
	/**
	* Tests whether a face includes a `CPAL` color-palette table.
	* @returns `true` if data found, `false` otherwise.
	*/
	hasColorPalettes() {
		return !!exports.hb_ot_color_has_palettes(this.ptr);
	}
	/**
	* Fetches the color palettes in the face's `CPAL` table.
	* @returns An array of the face's {@link ColorPalette | color palettes}.
	*/
	getColorPalettes() {
		const count = exports.hb_ot_color_palette_get_count(this.ptr);
		const palettes = [];
		const sp = Module.stackSave();
		const countPtr = Module.stackAlloc(4);
		const colorsPtr = Module.stackAlloc(512);
		for (let i = 0; i < count; i++) {
			const colors = [];
			let startOffset = 0;
			let colorCount = 128;
			while (colorCount === 128) {
				Module.HEAPU32[countPtr / 4] = colorCount;
				exports.hb_ot_color_palette_get_colors(this.ptr, i, startOffset, countPtr, colorsPtr);
				colorCount = Module.HEAPU32[countPtr / 4];
				for (let j = 0; j < colorCount; j++) {
					const color = color_from_int(Module.HEAPU32[colorsPtr / 4 + j]);
					const nameId = exports.hb_ot_color_palette_color_get_name_id(this.ptr, startOffset + j);
					if (nameId != HB_OT_NAME_ID_INVALID) color.nameId = nameId;
					colors.push(color);
				}
				startOffset += colorCount;
			}
			const palette = {
				colors,
				flags: exports.hb_ot_color_palette_get_flags(this.ptr, i)
			};
			const nameId = exports.hb_ot_color_palette_get_name_id(this.ptr, i);
			if (nameId != HB_OT_NAME_ID_INVALID) palette.nameId = nameId;
			palettes.push(palette);
		}
		Module.stackRestore(sp);
		return palettes;
	}
	/**
	* Tests whether a face includes a `COLR` table with data according to COLRv0.
	* @returns `true` if data found, `false` otherwise.
	*/
	hasColorLayers() {
		return !!exports.hb_ot_color_has_layers(this.ptr);
	}
	/**
	* Fetches a list of all color layers for the specified glyph index in the
	* specified face.
	* @param glyph The glyph index to query.
	* @returns An array of the glyph's {@link ColorLayer | color layers}.
	*/
	getGlyphColorLayers(glyph) {
		const layers = [];
		const sp = Module.stackSave();
		const countPtr = Module.stackAlloc(4);
		const layersPtr = Module.stackAlloc(1024);
		let startOffset = 0;
		let layerCount = 128;
		while (layerCount === 128) {
			Module.HEAPU32[countPtr / 4] = layerCount;
			exports.hb_ot_color_glyph_get_layers(this.ptr, glyph, startOffset, countPtr, layersPtr);
			layerCount = Module.HEAPU32[countPtr / 4];
			for (let i = 0; i < layerCount; i++) {
				const o = layersPtr / 4 + i * 2;
				const layer = { glyph: Module.HEAPU32[o] };
				const colorIndex = Module.HEAPU32[o + 1];
				if (colorIndex != 65535) layer.colorIndex = colorIndex;
				layers.push(layer);
			}
			startOffset += layerCount;
		}
		Module.stackRestore(sp);
		return layers;
	}
	/**
	* Tests whether a face includes a `COLR` table with data according to COLRv1.
	* @returns `true` if data found, `false` otherwise.
	*/
	hasColorPaint() {
		return !!exports.hb_ot_color_has_paint(this.ptr);
	}
	/**
	* Tests whether a face includes COLRv1 paint data for a glyph.
	* @param glyph The glyph index to query.
	* @returns `true` if data found, `false` otherwise.
	*/
	glyphHasColorPaint(glyph) {
		return !!exports.hb_ot_color_glyph_has_paint(this.ptr, glyph);
	}
	/**
	* Tests whether a face has PNG glyph images (either in `CBDT` or `sbix`
	* tables).
	* @returns `true` if data found, `false` otherwise.
	*/
	hasColorPng() {
		return !!exports.hb_ot_color_has_png(this.ptr);
	}
};
/**
* An object representing
* {@link https://harfbuzz.github.io/harfbuzz-hb-draw.html | HarfBuzz draw functions}.
*
* Glyph draw callbacks.
*
* The {@link DrawFuncs.setMoveToFunc | move-to},
* {@link DrawFuncs.setLineToFunc | line-to} and
* {@link DrawFuncs.setCubicToFunc | cubic-to} callbacks are necessary to be
* defined, but we translate {@link DrawFuncs.setQuadraticToFunc | quadratic-to}
* calls to cubic-to if the callback isn't defined.
*/
var DrawFuncs = class {
	constructor() {
		this.funcPtrs = [];
		this.userDataPtrs = [];
		this.ptr = exports.hb_draw_funcs_create();
		const ptr = this.ptr;
		const funcPtrs = this.funcPtrs;
		const userDataPtrs = this.userDataPtrs;
		registry.register(this, () => {
			exports.hb_draw_funcs_destroy(ptr);
			for (const ptr of funcPtrs) Module.removeFunction(ptr);
			for (const ptr of userDataPtrs) remove_callback_data_pointer(ptr);
		});
	}
	/**
	* Sets move-to callback to the draw functions object.
	* @param func The move-to callback.
	* @param userData Data to pass to `func`.
	*/
	setMoveToFunc(func, userData) {
		const userDataPtr = register_callback_data_pointer(userData);
		this.userDataPtrs.push(userDataPtr);
		const funcPtr = Module.addFunction((dfuncs, draw_data, draw_state, toX, toY, user_data) => {
			func(toX, toY, get_callback_data(draw_data), get_callback_data(user_data));
		}, "viiiffi");
		this.funcPtrs.push(funcPtr);
		exports.hb_draw_funcs_set_move_to_func(this.ptr, funcPtr, userDataPtr, 0);
	}
	/**
	* Sets line-to callback to the draw functions object.
	* @param func The line-to callback.
	* @param userData Data to pass to `func`.
	*/
	setLineToFunc(func, userData) {
		const userDataPtr = register_callback_data_pointer(userData);
		this.userDataPtrs.push(userDataPtr);
		const funcPtr = Module.addFunction((dfuncs, draw_data, draw_state, toX, toY, user_data) => {
			func(toX, toY, get_callback_data(draw_data), get_callback_data(user_data));
		}, "viiiffi");
		this.funcPtrs.push(funcPtr);
		exports.hb_draw_funcs_set_line_to_func(this.ptr, funcPtr, userDataPtr, 0);
	}
	/**
	* Sets quadratic-to callback to the draw functions object.
	* @param func The quadratic-to callback.
	* @param userData Data to pass to `func`.
	*/
	setQuadraticToFunc(func, userData) {
		const userDataPtr = register_callback_data_pointer(userData);
		this.userDataPtrs.push(userDataPtr);
		const funcPtr = Module.addFunction((dfuncs, draw_data, draw_state, cX, cY, toX, toY, user_data) => {
			func(cX, cY, toX, toY, get_callback_data(draw_data), get_callback_data(user_data));
		}, "viiiffffi");
		this.funcPtrs.push(funcPtr);
		exports.hb_draw_funcs_set_quadratic_to_func(this.ptr, funcPtr, userDataPtr, 0);
	}
	/**
	* Sets cubic-to callback to the draw functions object.
	* @param func The cubic-to callback.
	* @param userData Data to pass to `func`.
	*/
	setCubicToFunc(func, userData) {
		const userDataPtr = register_callback_data_pointer(userData);
		this.userDataPtrs.push(userDataPtr);
		const funcPtr = Module.addFunction((dfuncs, draw_data, draw_state, c1X, c1Y, c2X, c2Y, toX, toY, user_data) => {
			func(c1X, c1Y, c2X, c2Y, toX, toY, get_callback_data(draw_data), get_callback_data(user_data));
		}, "viiiffffffi");
		this.funcPtrs.push(funcPtr);
		exports.hb_draw_funcs_set_cubic_to_func(this.ptr, funcPtr, userDataPtr, 0);
	}
	/**
	* Sets close-path callback to the draw functions object.
	* @param func The close-path callback.
	* @param userData Data to pass to `func`.
	*/
	setClosePathFunc(func, userData) {
		const userDataPtr = register_callback_data_pointer(userData);
		this.userDataPtrs.push(userDataPtr);
		const funcPtr = Module.addFunction((dfuncs, draw_data, draw_state, user_data) => {
			func(get_callback_data(draw_data), get_callback_data(user_data));
		}, "viiii");
		this.funcPtrs.push(funcPtr);
		exports.hb_draw_funcs_set_close_path_func(this.ptr, funcPtr, userDataPtr, 0);
	}
};
hb_tag("hasc"), hb_tag("hdsc"), hb_tag("hlgp"), hb_tag("hcla"), hb_tag("hcld"), hb_tag("vasc"), hb_tag("vdsc"), hb_tag("vlgp"), hb_tag("hcrs"), hb_tag("hcrn"), hb_tag("hcof"), hb_tag("vcrs"), hb_tag("vcrn"), hb_tag("vcof"), hb_tag("xhgt"), hb_tag("cpht"), hb_tag("sbxs"), hb_tag("sbys"), hb_tag("sbxo"), hb_tag("sbyo"), hb_tag("spxs"), hb_tag("spys"), hb_tag("spxo"), hb_tag("spyo"), hb_tag("strs"), hb_tag("stro"), hb_tag("unds"), hb_tag("undo");
var pathDrawFuncs;
function getPathDrawFuncs() {
	if (!pathDrawFuncs) {
		pathDrawFuncs = new DrawFuncs();
		pathDrawFuncs.setMoveToFunc((x, y, path) => {
			path.push(`M${x},${y}`);
		});
		pathDrawFuncs.setLineToFunc((x, y, path) => {
			path.push(`L${x},${y}`);
		});
		pathDrawFuncs.setCubicToFunc((c1x, c1y, c2x, c2y, x, y, path) => {
			path.push(`C${c1x},${c1y} ${c2x},${c2y} ${x},${y}`);
		});
		pathDrawFuncs.setQuadraticToFunc((cx, cy, x, y, path) => {
			path.push(`Q${cx},${cy} ${x},${y}`);
		});
		pathDrawFuncs.setClosePathFunc((path) => {
			path.push("Z");
		});
	}
	return pathDrawFuncs;
}
var jsonDrawFuncs;
function getJsonDrawFuncs() {
	if (!jsonDrawFuncs) {
		jsonDrawFuncs = new DrawFuncs();
		jsonDrawFuncs.setMoveToFunc((x, y, commands) => {
			commands.push({
				type: "M",
				values: [x, y]
			});
		});
		jsonDrawFuncs.setLineToFunc((x, y, commands) => {
			commands.push({
				type: "L",
				values: [x, y]
			});
		});
		jsonDrawFuncs.setCubicToFunc((c1x, c1y, c2x, c2y, x, y, commands) => {
			commands.push({
				type: "C",
				values: [
					c1x,
					c1y,
					c2x,
					c2y,
					x,
					y
				]
			});
		});
		jsonDrawFuncs.setQuadraticToFunc((cx, cy, x, y, commands) => {
			commands.push({
				type: "Q",
				values: [
					cx,
					cy,
					x,
					y
				]
			});
		});
		jsonDrawFuncs.setClosePathFunc((commands) => {
			commands.push({
				type: "Z",
				values: []
			});
		});
	}
	return jsonDrawFuncs;
}
/**
* An object representing a {@link https://harfbuzz.github.io/harfbuzz-hb-font.html | HarfBuzz font}.
* A font represents a face at a specific size and with certain other
* parameters (pixels-per-em, variation settings) specified. Fonts are the
* primary input to the shaping process.
*/
var Font = class Font {
	constructor(arg) {
		if (typeof arg === "number") this.ptr = exports.hb_font_reference(arg);
		else {
			this.ptr = exports.hb_font_create(arg.ptr);
			this._face = arg;
		}
		track(this, exports.hb_font_destroy);
	}
	/** The {@link Face} associated with this font. */
	get face() {
		if (!this._face) this._face = new Face(exports.hb_font_get_face(this.ptr));
		return this._face;
	}
	/**
	* Create a sub font that inherits this font's properties.
	* @returns A new Font object representing the sub font.
	*/
	subFont() {
		return new Font(exports.hb_font_create_sub_font(this.ptr));
	}
	/**
	* Return font horizontal extents.
	* @returns Object with ascender, descender, and lineGap properties.
	*/
	hExtents() {
		const sp = Module.stackSave();
		const extentsPtr = Module.stackAlloc(48);
		exports.hb_font_get_h_extents(this.ptr, extentsPtr);
		const extents = {
			ascender: Module.HEAP32[extentsPtr / 4],
			descender: Module.HEAP32[extentsPtr / 4 + 1],
			lineGap: Module.HEAP32[extentsPtr / 4 + 2]
		};
		Module.stackRestore(sp);
		return extents;
	}
	/**
	* Return font vertical extents.
	* @returns Object with ascender, descender, and lineGap properties.
	*/
	vExtents() {
		const sp = Module.stackSave();
		const extentsPtr = Module.stackAlloc(48);
		exports.hb_font_get_v_extents(this.ptr, extentsPtr);
		const extents = {
			ascender: Module.HEAP32[extentsPtr / 4],
			descender: Module.HEAP32[extentsPtr / 4 + 1],
			lineGap: Module.HEAP32[extentsPtr / 4 + 2]
		};
		Module.stackRestore(sp);
		return extents;
	}
	/**
	* Return glyph name.
	* @param glyphId ID of the requested glyph in the font.
	* @returns The glyph name string.
	*/
	glyphName(glyphId) {
		const sp = Module.stackSave();
		const strSize = 256;
		const strPtr = Module.stackAlloc(strSize);
		exports.hb_font_glyph_to_string(this.ptr, glyphId, strPtr, strSize);
		const name = utf8_ptr_to_string(strPtr);
		Module.stackRestore(sp);
		return name;
	}
	/**
	* Draws the outline that corresponds to a glyph in the specified font.
	*
	* The outline is returned by way of calls to the callbacks of the `drawFuncs`
	* object, with `drawData` passed to them.
	* @param glyphId The glyph ID.
	* @param drawFuncs The {@link DrawFuncs} to draw to.
	* @param drawData User data to pass to draw callbacks.
	*/
	drawGlyph(glyphId, drawFuncs, drawData) {
		const drawDataPtr = register_callback_data_pointer(drawData);
		try {
			exports.hb_font_draw_glyph(this.ptr, glyphId, drawFuncs.ptr, drawDataPtr);
		} finally {
			remove_callback_data_pointer(drawDataPtr);
		}
	}
	/**
	* Draws the outline that corresponds to a glyph in the specified font.
	*
	* This is a newer name for {@link Font.drawGlyph}, that returns `false` if the
	* font has no outlines for the glyph.
	*
	* The outline is returned by way of calls to the callbacks of the `drawFuncs`
	* object, with `drawData` passed to them.
	* @param glyphId The glyph ID.
	* @param drawFuncs The {@link DrawFuncs} to draw to.
	* @param drawData User data to pass to draw callbacks.
	* @returns `true` if the glyph was drawn, `false` otherwise.
	*/
	drawGlyphOrFail(glyphId, drawFuncs, drawData) {
		const drawDataPtr = register_callback_data_pointer(drawData);
		try {
			return !!exports.hb_font_draw_glyph_or_fail(this.ptr, glyphId, drawFuncs.ptr, drawDataPtr);
		} finally {
			remove_callback_data_pointer(drawDataPtr);
		}
	}
	/**
	* Paints the glyph. This function is similar to {@link Font.paintGlyphOrFail},
	* but if painting a color glyph failed, it will fall back to painting an
	* outline monochrome glyph.
	*
	* The painting instructions are returned by way of calls to the callbacks of
	* the `paintFuncs` object, with `paintData` passed to them.
	*
	* If the font has color palettes, then `paletteIndex` selects the palette to
	* use. If the font only has one palette, this will be 0.
	* @param glyphId The glyph ID.
	* @param paintFuncs The {@link PaintFuncs} to paint with.
	* @param paintData User data to pass to paint callbacks.
	* @param paletteIndex The index of the font's color palette to use.
	* @param foreground The foreground color, unpremultiplied.
	*/
	paintGlyph(glyphId, paintFuncs, paintData, paletteIndex = 0, foreground = {
		red: 0,
		green: 0,
		blue: 0,
		alpha: 255
	}) {
		const paintDataPtr = register_callback_data_pointer(paintData);
		try {
			exports.hb_font_paint_glyph(this.ptr, glyphId, paintFuncs.ptr, paintDataPtr, paletteIndex, color_to_int(foreground));
		} finally {
			remove_callback_data_pointer(paintDataPtr);
		}
	}
	/**
	* Paints a color glyph.
	*
	* Succeeds if the glyph has color paint layers (COLRv0), a color paint graph
	* (COLRv1), or a bitmap image that the font's callbacks render successfully.
	* Returns `false` if the font has no color data for the glyph; the client can
	* then fall back to {@link Font.drawGlyphOrFail} for the monochrome outline.
	*
	* The painting instructions are returned by way of calls to the callbacks of
	* the `paintFuncs` object, with `paintData` passed to them.
	*
	* If the font has color palettes, then `paletteIndex` selects the palette to
	* use. If the font only has one palette, this will be 0.
	* @param glyphId The glyph ID.
	* @param paintFuncs The {@link PaintFuncs} to paint with.
	* @param paintData User data to pass to paint callbacks.
	* @param paletteIndex The index of the font's color palette to use.
	* @param foreground The foreground color, unpremultiplied.
	* @returns `true` if the glyph was painted, `false` otherwise.
	*/
	paintGlyphOrFail(glyphId, paintFuncs, paintData, paletteIndex = 0, foreground = {
		red: 0,
		green: 0,
		blue: 0,
		alpha: 255
	}) {
		const paintDataPtr = register_callback_data_pointer(paintData);
		try {
			return !!exports.hb_font_paint_glyph_or_fail(this.ptr, glyphId, paintFuncs.ptr, paintDataPtr, paletteIndex, color_to_int(foreground));
		} finally {
			remove_callback_data_pointer(paintDataPtr);
		}
	}
	/**
	* Fetches the PNG image for a glyph.
	*
	* To get an optimally sized PNG blob, the PPEM values must be set on the font.
	* If PPEM is unset, the blob returned will be the largest PNG available.
	* @param glyphId A glyph index.
	* @returns The PNG image for the glyph, or `undefined` if the glyph has no PNG
	* image.
	*/
	getGlyphColorPng(glyphId) {
		const blob = exports.hb_ot_color_glyph_reference_png(this.ptr, glyphId);
		const length = exports.hb_blob_get_length(blob);
		let png;
		if (length) {
			const dataPtr = exports.hb_blob_get_data(blob, 0);
			png = Module.HEAPU8.slice(dataPtr, dataPtr + length);
		}
		exports.hb_blob_destroy(blob);
		return png;
	}
	/**
	* Return a glyph as an SVG path string.
	* @param glyphId ID of the requested glyph in the font.
	* @returns SVG path data string.
	*/
	glyphToPath(glyphId) {
		const path = [];
		this.drawGlyph(glyphId, getPathDrawFuncs(), path);
		return path.join("");
	}
	/**
	* Return glyph horizontal advance.
	* @param glyphId ID of the requested glyph in the font.
	* @returns The horizontal advance width.
	*/
	glyphHAdvance(glyphId) {
		return exports.hb_font_get_glyph_h_advance(this.ptr, glyphId);
	}
	/**
	* Return glyph vertical advance.
	* @param glyphId ID of the requested glyph in the font.
	* @returns The vertical advance height.
	*/
	glyphVAdvance(glyphId) {
		return exports.hb_font_get_glyph_v_advance(this.ptr, glyphId);
	}
	/**
	* Return glyph horizontal origin.
	* @param glyphId ID of the requested glyph in the font.
	* @returns [x, y] origin coordinates, or undefined if not available.
	*/
	glyphHOrigin(glyphId) {
		const sp = Module.stackSave();
		const xPtr = Module.stackAlloc(4);
		const yPtr = Module.stackAlloc(4);
		let origin;
		if (exports.hb_font_get_glyph_h_origin(this.ptr, glyphId, xPtr, yPtr)) origin = [Module.HEAP32[xPtr / 4], Module.HEAP32[yPtr / 4]];
		Module.stackRestore(sp);
		return origin;
	}
	/**
	* Return glyph vertical origin.
	* @param glyphId ID of the requested glyph in the font.
	* @returns [x, y] origin coordinates, or undefined if not available.
	*/
	glyphVOrigin(glyphId) {
		const sp = Module.stackSave();
		const xPtr = Module.stackAlloc(4);
		const yPtr = Module.stackAlloc(4);
		let origin;
		if (exports.hb_font_get_glyph_v_origin(this.ptr, glyphId, xPtr, yPtr)) origin = [Module.HEAP32[xPtr / 4], Module.HEAP32[yPtr / 4]];
		Module.stackRestore(sp);
		return origin;
	}
	/**
	* Return glyph extents.
	* @param glyphId ID of the requested glyph in the font.
	* @returns An object with xBearing, yBearing, width, and height, or undefined.
	*/
	glyphExtents(glyphId) {
		const sp = Module.stackSave();
		const extentsPtr = Module.stackAlloc(16);
		let extents;
		if (exports.hb_font_get_glyph_extents(this.ptr, glyphId, extentsPtr)) extents = {
			xBearing: Module.HEAP32[extentsPtr / 4],
			yBearing: Module.HEAP32[extentsPtr / 4 + 1],
			width: Module.HEAP32[extentsPtr / 4 + 2],
			height: Module.HEAP32[extentsPtr / 4 + 3]
		};
		Module.stackRestore(sp);
		return extents;
	}
	/**
	* Fetches the glyph ID for a Unicode code point in the specified
	* font, with an optional variation selector.
	*
	* If `variationSelector` is 0, it is equivalent to
	* {@link Font.nominalGlyph}; otherwise it is equivalent to
	* {@link Font.variationGlyph}.
	*
	* @param unicode The Unicode code point to query.
	* @param variationSelector A variation-selector code point.
	* @returns The glyph ID, or undefined if not found.
	*/
	glyph(unicode, variationSelector = 0) {
		const sp = Module.stackSave();
		const glyphIdPtr = Module.stackAlloc(4);
		let glyphId;
		if (exports.hb_font_get_glyph(this.ptr, unicode, variationSelector, glyphIdPtr)) glyphId = Module.HEAPU32[glyphIdPtr / 4];
		Module.stackRestore(sp);
		return glyphId;
	}
	/**
	* Fetches the nominal glyph ID for a Unicode code point in the
	* specified font.
	*
	* This version of the function should not be used to fetch glyph IDs
	* for code points modified by variation selectors. For variation-selector
	* support, use {@link Font.variationGlyph} or {@link Font.glyph}.
	*
	* @param unicode The Unicode code point to query.
	* @returns The glyph ID, or undefined if not found.
	*/
	nominalGlyph(unicode) {
		const sp = Module.stackSave();
		const glyphIdPtr = Module.stackAlloc(4);
		let glyphId;
		if (exports.hb_font_get_nominal_glyph(this.ptr, unicode, glyphIdPtr)) glyphId = Module.HEAPU32[glyphIdPtr / 4];
		Module.stackRestore(sp);
		return glyphId;
	}
	/**
	* Fetches the glyph ID for a Unicode code point when followed by
	* by the specified variation-selector code point, in the specified
	* font.
	*
	* @param unicode The Unicode code point to query.
	* @param variationSelector The variation-selector code point to query.
	* @returns The glyph ID, or undefined if not found.
	*/
	variationGlyph(unicode, variationSelector) {
		const sp = Module.stackSave();
		const glyphIdPtr = Module.stackAlloc(4);
		let glyphId;
		if (exports.hb_font_get_variation_glyph(this.ptr, unicode, variationSelector, glyphIdPtr)) glyphId = Module.HEAPU32[glyphIdPtr / 4];
		Module.stackRestore(sp);
		return glyphId;
	}
	/**
	* Return glyph ID from name.
	* @param name Name of the requested glyph in the font.
	* @returns The glyph ID, or undefined if not found.
	*/
	glyphFromName(name) {
		const sp = Module.stackSave();
		const glyphIdPtr = Module.stackAlloc(4);
		const namePtr = string_to_utf8_ptr(name);
		let glyphId;
		if (exports.hb_font_get_glyph_from_name(this.ptr, namePtr.ptr, namePtr.length, glyphIdPtr)) glyphId = Module.HEAPU32[glyphIdPtr / 4];
		namePtr.free();
		Module.stackRestore(sp);
		return glyphId;
	}
	/**
	* Return a glyph as a JSON path string
	* based on format described on https://svgwg.org/specs/paths/#InterfaceSVGPathSegment
	* @param glyphId ID of the requested glyph in the font.
	* @returns An array of path segment objects with type and values.
	*/
	glyphToJson(glyphId) {
		const commands = [];
		this.drawGlyph(glyphId, getJsonDrawFuncs(), commands);
		return commands;
	}
	/**
	* Set the font's scale factor, affecting the position values returned from
	* shaping.
	* @param xScale Units to scale in the X dimension.
	* @param yScale Units to scale in the Y dimension.
	*/
	setScale(xScale, yScale) {
		exports.hb_font_set_scale(this.ptr, xScale, yScale);
	}
	/**
	* Applies a list of font-variation settings to a font.
	*
	* Note that this overrides all existing variations set on the font.
	* Axes not included in `variations` will be effectively set to their
	* default values.
	*
	* @param variations Array of variation settings to apply.
	*/
	setVariations(variations) {
		const sp = Module.stackSave();
		const vars = Module.stackAlloc(8 * variations.length);
		variations.forEach((variation, i) => {
			variation.writeTo(vars + i * 8);
		});
		exports.hb_font_set_variations(this.ptr, vars, variations.length);
		Module.stackRestore(sp);
	}
	/** Set the font's font functions. */
	setFuncs(fontFuncs) {
		exports.hb_font_set_funcs(this.ptr, fontFuncs.ptr);
	}
	/**
	* Fetches the optical bound of a glyph positioned at the margin of text.
	* The direction identifies which edge of the glyph to query.
	* @param lookupIndex Index of the feature lookup to query.
	* @param direction Edge of the glyph to query.
	* @param glyph A glyph id.
	* @returns Adjustment value. Negative values mean the glyph will stick out of the margin.
	*/
	getLookupOpticalBound(lookupIndex, direction, glyph) {
		return exports.hb_ot_layout_lookup_get_optical_bound(this.ptr, lookupIndex, direction, glyph);
	}
	/**
	* Fetches a list of the caret positions defined for a ligature glyph in the
	* GDEF table of the font.
	*
	* Note that a ligature that is formed from n characters will have n-1
	* caret positions. The first character is not represented in the array,
	* since its caret position is the glyph position.
	*
	* The positions returned by this function are 'unshaped', and will have to
	* be fixed up for kerning that may be applied to the ligature glyph.
	*
	* @param direction The text direction to use.
	* @param glyph The glyph to query.
	* @returns An array of caret positions.
	*/
	getLigatureCarets(direction, glyph) {
		const sp = Module.stackSave();
		let startOffset = 0;
		let caretCount = 128;
		const caretCountPtr = Module.stackAlloc(4);
		const caretArrayPtr = Module.stackAlloc(512);
		const carets = [];
		while (caretCount == 128) {
			Module.HEAPU32[caretCountPtr / 4] = caretCount;
			exports.hb_ot_layout_get_ligature_carets(this.ptr, direction, glyph, startOffset, caretCountPtr, caretArrayPtr);
			caretCount = Module.HEAPU32[caretCountPtr / 4];
			const caretArray = Module.HEAP32.subarray(caretArrayPtr / 4, caretArrayPtr / 4 + caretCount);
			carets.push(...Array.from(caretArray));
			startOffset += caretCount;
		}
		Module.stackRestore(sp);
		return carets;
	}
	/**
	* Fetches metrics value corresponding to `metricsTag` from the font.
	*
	* @param metricsTag {@link MetricsTag} of metrics value you like to fetch.
	* @returns The metrics value, or undefined if not found in the font.
	*/
	getMetricPosition(metricsTag) {
		const sp = Module.stackSave();
		const positionPtr = Module.stackAlloc(4);
		let position;
		if (exports.hb_ot_metrics_get_position(this.ptr, metricsTag, positionPtr)) position = Module.HEAP32[positionPtr / 4];
		Module.stackRestore(sp);
		return position;
	}
	/**
	* Fetches metrics value corresponding to `metricsTag` from the font, and
	* synthesizes a value if the value is missing in the font.
	*
	* @param metricsTag {@link MetricsTag} of metrics value you like to fetch.
	* @returns The metrics value.
	*/
	getMetricPositionWithFallback(metricsTag) {
		const sp = Module.stackSave();
		const positionPtr = Module.stackAlloc(4);
		exports.hb_ot_metrics_get_position_with_fallback(this.ptr, metricsTag, positionPtr);
		const position = Module.HEAP32[positionPtr / 4];
		Module.stackRestore(sp);
		return position;
	}
	/**
	* Fetches metrics value corresponding to `metricsTag` from the font with the
	* current font variation settings applied.
	*
	* @param metricsTag {@link MetricsTag} of metrics value you like to fetch.
	* @returns The requested metric value.
	*/
	getMetricVariation(metricsTag) {
		return exports.hb_ot_metrics_get_variation(this.ptr, metricsTag);
	}
	/**
	* Fetches horizontal metrics value corresponding to `metricsTag` from the
	* font with the current font variation settings applied.
	*
	* @param metricsTag {@link MetricsTag} of metrics value you like to fetch.
	* @returns The requested metric value.
	*/
	getMetricXVariation(metricsTag) {
		return exports.hb_ot_metrics_get_x_variation(this.ptr, metricsTag);
	}
	/**
	* Fetches vertical metrics value corresponding to `metricsTag` from the font
	* with the current font variation settings applied.
	*
	* @param metricsTag {@link MetricsTag} of metrics value you like to fetch.
	* @returns The requested metric value.
	*/
	getMetricYVariation(metricsTag) {
		return exports.hb_ot_metrics_get_y_variation(this.ptr, metricsTag);
	}
};
var BufferSerializeFormat = {
	INVALID: 0,
	TEXT: hb_tag("TEXT"),
	JSON: hb_tag("JSON")
};
/**
* An object representing a {@link https://harfbuzz.github.io/harfbuzz-hb-buffer.html | HarfBuzz buffer}.
* A buffer holds the input text and its properties before shaping, and the
* output glyphs and their information after shaping.
*/
var Buffer = class Buffer {
	/**
	* @param existingPtr @internal Wrap an existing buffer pointer.
	*/
	constructor(existingPtr) {
		if (existingPtr != void 0) this.ptr = exports.hb_buffer_reference(existingPtr);
		else this.ptr = exports.hb_buffer_create();
		track(this, exports.hb_buffer_destroy);
	}
	/**
	* Appends a character with the Unicode value of `codePoint` to the buffer,
	* and gives it the initial cluster value of `cluster`. Clusters can be any
	* thing the client wants, they are usually used to refer to the index of the
	* character in the input text stream and are output in the `cluster` field
	* of {@link GlyphInfo}.
	*
	* This function does not check the validity of `codePoint`, it is up to the
	* caller to ensure it is a valid Unicode code point.
	* @param codePoint A Unicode code point.
	* @param cluster The cluster value of `codePoint`.
	*/
	add(codePoint, cluster) {
		exports.hb_buffer_add(this.ptr, codePoint, cluster);
	}
	/**
	* Add text to the buffer.
	* @param text Text to be added to the buffer.
	* @param itemOffset The offset of the first character to add to the buffer.
	* @param itemLength The number of characters to add to the buffer, or omit for the end of text.
	*/
	addText(text, itemOffset = 0, itemLength) {
		const str = string_to_utf16_ptr(text);
		exports.hb_buffer_add_utf16(this.ptr, str.ptr, str.length, itemOffset, itemLength ?? str.length);
		str.free();
	}
	/**
	* Add code points to the buffer.
	* @param codePoints Array of code points to be added to the buffer.
	* @param itemOffset The offset of the first code point to add to the buffer.
	* @param itemLength The number of code points to add to the buffer, or omit for the end of the array.
	*/
	addCodePoints(codePoints, itemOffset = 0, itemLength) {
		const codePointsPtr = exports.malloc(codePoints.length * 4);
		Module.HEAPU32.subarray(codePointsPtr / 4, codePointsPtr / 4 + codePoints.length).set(codePoints);
		exports.hb_buffer_add_codepoints(this.ptr, codePointsPtr, codePoints.length, itemOffset, itemLength ?? codePoints.length);
		exports.free(codePointsPtr);
	}
	/**
	* Set buffer script, language and direction.
	*
	* This needs to be done before shaping.
	*/
	guessSegmentProperties() {
		exports.hb_buffer_guess_segment_properties(this.ptr);
	}
	/**
	* Set buffer direction explicitly.
	* @param dir A {@link Direction} value.
	*/
	setDirection(dir) {
		exports.hb_buffer_set_direction(this.ptr, dir);
	}
	/**
	* Set buffer flags explicitly.
	* @param flags A combination of {@link BufferFlag} values (OR them together).
	*/
	setFlags(flags) {
		exports.hb_buffer_set_flags(this.ptr, flags);
	}
	/**
	* Set buffer language explicitly.
	* @param language The buffer language
	*/
	setLanguage(language) {
		const str = string_to_ascii_ptr(language);
		exports.hb_buffer_set_language(this.ptr, exports.hb_language_from_string(str.ptr, -1));
		str.free();
	}
	/**
	* Set buffer script explicitly.
	* @param script The buffer script
	*/
	setScript(script) {
		const str = string_to_ascii_ptr(script);
		exports.hb_buffer_set_script(this.ptr, exports.hb_script_from_string(str.ptr, -1));
		str.free();
	}
	/**
	* Set the HarfBuzz clustering level.
	*
	* Affects the cluster values returned from shaping.
	* @param level A {@link ClusterLevel} value. See the HarfBuzz manual chapter on Clusters.
	*/
	setClusterLevel(level) {
		exports.hb_buffer_set_cluster_level(this.ptr, level);
	}
	/** Reset the buffer to its initial status. */
	reset() {
		exports.hb_buffer_reset(this.ptr);
	}
	/**
	* Similar to reset(), but does not clear the Unicode functions and the
	* replacement code point.
	*/
	clearContents() {
		exports.hb_buffer_clear_contents(this.ptr);
	}
	/**
	* Set message func.
	* @param func The function to set. It receives the buffer, font, and message
	* string as arguments. Returning false will skip this shaping step and move
	* to the next one.
	*/
	setMessageFunc(func) {
		const traceFunc = (bufferPtr, fontPtr, messagePtr, user_data) => {
			const message = utf8_ptr_to_string(messagePtr);
			return func(new Buffer(bufferPtr), new Font(fontPtr), message) ? 1 : 0;
		};
		const traceFuncPtr = Module.addFunction(traceFunc, "iiiii");
		exports.hb_buffer_set_message_func(this.ptr, traceFuncPtr, 0, 0);
	}
	/**
	* Get the the number of items in the buffer.
	* @returns The buffer length.
	*/
	getLength() {
		return exports.hb_buffer_get_length(this.ptr);
	}
	/**
	* Get the glyph information from the buffer.
	* @returns An array of {@link GlyphInfo} objects.
	*/
	getGlyphInfos() {
		const infosPtr = exports.hb_buffer_get_glyph_infos(this.ptr, 0);
		const infosArray = Module.HEAPU32.subarray(infosPtr / 4, infosPtr / 4 + this.getLength() * 5);
		const infos = [];
		for (let i = 0; i < infosArray.length; i += 5) infos.push({
			codepoint: infosArray[i],
			cluster: infosArray[i + 2],
			flags: exports.hb_glyph_info_get_glyph_flags(infosPtr + i * 4)
		});
		return infos;
	}
	/**
	* Get the glyph positions from the buffer.
	* @returns An array of {@link GlyphPosition} objects.
	*/
	getGlyphPositions() {
		const positionsPtr32 = exports.hb_buffer_get_glyph_positions(this.ptr, 0) / 4;
		if (positionsPtr32 == 0) return [];
		const positionsArray = Module.HEAP32.subarray(positionsPtr32, positionsPtr32 + this.getLength() * 5);
		const positions = [];
		for (let i = 0; i < positionsArray.length; i += 5) positions.push({
			xAdvance: positionsArray[i],
			yAdvance: positionsArray[i + 1],
			xOffset: positionsArray[i + 2],
			yOffset: positionsArray[i + 3]
		});
		return positions;
	}
	/**
	* Get the glyph information and positions from the buffer.
	* @returns The glyph information and positions.
	*
	* The glyph information is returned as an array of objects with the
	* properties from getGlyphInfos and getGlyphPositions combined.
	*/
	getGlyphInfosAndPositions() {
		const infosPtr = exports.hb_buffer_get_glyph_infos(this.ptr, 0);
		const infosArray = Module.HEAPU32.subarray(infosPtr / 4, infosPtr / 4 + this.getLength() * 5);
		const positionsPtr32 = exports.hb_buffer_get_glyph_positions(this.ptr, 0) / 4;
		const positionsArray = positionsPtr32 ? Module.HEAP32.subarray(positionsPtr32, positionsPtr32 + this.getLength() * 5) : void 0;
		const out = [];
		for (let i = 0; i < infosArray.length; i += 5) {
			const info = {
				codepoint: infosArray[i],
				cluster: infosArray[i + 2],
				flags: exports.hb_glyph_info_get_glyph_flags(infosPtr + i * 4)
			};
			for (const [name, idx] of [
				["mask", 1],
				["var1", 3],
				["var2", 4]
			]) Object.defineProperty(info, name, {
				value: infosArray[i + idx],
				enumerable: false
			});
			if (positionsArray) {
				info.xAdvance = positionsArray[i];
				info.yAdvance = positionsArray[i + 1];
				info.xOffset = positionsArray[i + 2];
				info.yOffset = positionsArray[i + 3];
				Object.defineProperty(info, "var", {
					value: positionsArray[i + 4],
					enumerable: false
				});
			}
			out.push(info);
		}
		return out;
	}
	/**
	* Update the glyph positions in the buffer.
	* WARNING: Do not use unless you know what you are doing.
	*/
	updateGlyphPositions(positions) {
		const positionsPtr32 = exports.hb_buffer_get_glyph_positions(this.ptr, 0) / 4;
		if (positionsPtr32 == 0) return;
		const len = Math.min(positions.length, this.getLength());
		const positionsArray = Module.HEAP32.subarray(positionsPtr32, positionsPtr32 + len * 5);
		for (let i = 0; i < len; i++) {
			positionsArray[i * 5] = positions[i].xAdvance;
			positionsArray[i * 5 + 1] = positions[i].yAdvance;
			positionsArray[i * 5 + 2] = positions[i].xOffset;
			positionsArray[i * 5 + 3] = positions[i].yOffset;
		}
	}
	/**
	* Serialize the buffer contents to a string.
	* @param options Serialization options:
	*  - `font`: the font to use for serialization;
	*  - `start`: the starting index of the glyphs (default `0`);
	*  - `end`: the ending index of the glyphs (default end of buffer);
	*  - `format`: a {@link BufferSerializeFormat} value (default `TEXT`);
	*  - `flags`: a combination of {@link BufferSerializeFlag} values (default `0`).
	* @returns The serialized buffer contents.
	*/
	serialize(options = {}) {
		let { font, start = 0, end, format = BufferSerializeFormat.TEXT, flags = 0 } = options;
		const sp = Module.stackSave();
		const endPos = end ?? this.getLength();
		const bufLen = 32768;
		const bufPtr = exports.malloc(bufLen);
		const bufConsumedPtr = Module.stackAlloc(4);
		let result = "";
		while (start < endPos) {
			start += exports.hb_buffer_serialize(this.ptr, start, endPos, bufPtr, bufLen, bufConsumedPtr, font ? font.ptr : 0, format, flags);
			const bufConsumed = Module.HEAPU32[bufConsumedPtr / 4];
			if (bufConsumed == 0) break;
			result += utf8_ptr_to_string(bufPtr, bufConsumed);
		}
		exports.free(bufPtr);
		Module.stackRestore(sp);
		return result;
	}
	/**
	* Return the buffer content type.
	*
	* @returns The buffer content type as a {@link BufferContentType} value.
	*/
	getContentType() {
		return exports.hb_buffer_get_content_type(this.ptr);
	}
};
(class Feature {
	static {
		this.GLOBAL_START = 0;
	}
	static {
		this.GLOBAL_END = 4294967295;
	}
	constructor(tag, value = 1, start = Feature.GLOBAL_START, end = Feature.GLOBAL_END) {
		this.tag = tag;
		this.value = value;
		this.start = start;
		this.end = end;
	}
	/**
	* Parses a string into a Feature.
	*
	* The format for specifying feature strings follows. All valid CSS
	* font-feature-settings values other than `normal` and the global values are
	* also accepted, though not documented below. CSS string escapes are not
	* supported.
	*
	* The range indices refer to the positions between Unicode characters. The
	* position before the first character is always 0.
	*
	* The format is Python-esque. Here is how it all works:
	*
	* | Syntax        | Value | Start | End | Meaning                          |
	* | ------------- | ----- | ----- | --- | -------------------------------- |
	* | `kern`        | 1     | 0     | ∞   | Turn feature on                  |
	* | `+kern`       | 1     | 0     | ∞   | Turn feature on                  |
	* | `-kern`       | 0     | 0     | ∞   | Turn feature off                 |
	* | `kern=0`      | 0     | 0     | ∞   | Turn feature off                 |
	* | `kern=1`      | 1     | 0     | ∞   | Turn feature on                  |
	* | `aalt=2`      | 2     | 0     | ∞   | Choose 2nd alternate             |
	* | `kern[]`      | 1     | 0     | ∞   | Turn feature on                  |
	* | `kern[:]`     | 1     | 0     | ∞   | Turn feature on                  |
	* | `kern[5:]`    | 1     | 5     | ∞   | Turn feature on, partial         |
	* | `kern[:5]`    | 1     | 0     | 5   | Turn feature on, partial         |
	* | `kern[3:5]`   | 1     | 3     | 5   | Turn feature on, range           |
	* | `kern[3]`     | 1     | 3     | 3+1 | Turn feature on, single char     |
	* | `aalt[3:5]=2` | 2     | 3     | 5   | Turn 2nd alternate on for range  |
	*
	* @param str The string to parse.
	* @returns A Feature, or undefined if the string is not a valid feature.
	*/
	static fromString(str) {
		const sp = Module.stackSave();
		const featurePtr = Module.stackAlloc(16);
		const strPtr = string_to_ascii_ptr(str);
		let feature;
		if (exports.hb_feature_from_string(strPtr.ptr, -1, featurePtr)) feature = new Feature(hb_untag(Module.HEAPU32[featurePtr / 4]), Module.HEAPU32[featurePtr / 4 + 1], Module.HEAPU32[featurePtr / 4 + 2], Module.HEAPU32[featurePtr / 4 + 3]);
		strPtr.free();
		Module.stackRestore(sp);
		return feature;
	}
	/**
	* Converts the feature to a string in the format understood by
	* {@link Feature.fromString}.
	*
	* Note that the feature value will be omitted if it is `1`, but the string
	* won't include any whitespace.
	*
	* @returns The feature string.
	*/
	toString() {
		const sp = Module.stackSave();
		const featurePtr = Module.stackAlloc(16);
		this.writeTo(featurePtr);
		const bufLen = 128;
		const bufPtr = Module.stackAlloc(bufLen);
		exports.hb_feature_to_string(featurePtr, bufPtr, bufLen);
		const result = utf8_ptr_to_string(bufPtr);
		Module.stackRestore(sp);
		return result;
	}
	/** @internal Write this feature into the given hb_feature_t pointer. */
	writeTo(ptr) {
		Module.HEAPU32[ptr / 4] = hb_tag(this.tag);
		Module.HEAPU32[ptr / 4 + 1] = this.value;
		Module.HEAPU32[ptr / 4 + 2] = this.start;
		Module.HEAPU32[ptr / 4 + 3] = this.end;
	}
});
/**
* Shape a buffer with a given font.
*
* Converts the Unicode text in the buffer into positioned glyphs.
* The buffer is modified in place.
*
* @param font The Font to shape with.
* @param buffer The Buffer containing text to shape, suitably prepared
*   (text added, segment properties set).
* @param features An array of {@link Feature} values to apply.
*/
function shape(font, buffer, features) {
	const featuresLen = features?.length ?? 0;
	const sp = Module.stackSave();
	let featuresPtr = 0;
	if (featuresLen) {
		featuresPtr = Module.stackAlloc(16 * featuresLen);
		features.forEach((feature, i) => {
			feature.writeTo(featuresPtr + i * 16);
		});
	}
	exports.hb_shape(font.ptr, buffer.ptr, featuresPtr, featuresLen);
	Module.stackRestore(sp);
}
init(await createHarfBuzz());
var ShapingFont = class {
	font;
	scale;
	ascent;
	descent;
	lineHeight;
	constructor(bytes) {
		this.font = new Font(new Face(new Blob(bytes)));
		this.scale = 100 / this.font.face.upem;
		const ext = this.font.hExtents();
		this.ascent = ext.ascender * this.scale;
		this.descent = -ext.descender * this.scale;
		this.lineHeight = (ext.ascender - ext.descender + ext.lineGap) * this.scale;
	}
	shape(text) {
		const lines = [];
		let base = 0;
		text.split("\n").forEach((lineText, line) => {
			lines.push(this.shapeLine(lineText, line, base));
			base += lineText.length + 1;
		});
		return {
			lines,
			ascent: this.ascent,
			descent: this.descent,
			lineHeight: this.lineHeight
		};
	}
	shapeLine(text, line, base) {
		const buf = new Buffer();
		buf.addText(text);
		buf.guessSegmentProperties();
		shape(this.font, buf);
		const infos = buf.getGlyphInfos();
		const positions = buf.getGlyphPositions();
		const s = this.scale;
		const glyphs = [];
		let pen = 0;
		infos.forEach((info, i) => {
			const p = positions[i];
			const ox = pen + p.xOffset;
			const oy = p.yOffset;
			const raw = this.font.glyphToJson(info.codepoint);
			if (raw.length > 0) {
				const cmds = mapCmds(raw, (x, y) => [(x + ox) * s, -(y + oy) * s]);
				glyphs.push({
					cmds,
					cluster: base + info.cluster,
					line
				});
			}
			pen += p.xAdvance;
		});
		return {
			glyphs,
			width: pen * s
		};
	}
};
// src/core/compose.ts
function hash(s) {
	let h = 2166136261;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}
function mulberry32(seed) {
	let a = seed >>> 0;
	return () => {
		a = a + 1831565813 >>> 0;
		let t = a;
		t = Math.imul(t ^ t >>> 15, t | 1);
		t ^= t + Math.imul(t ^ t >>> 7, t | 61);
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}
var num = (v) => {
	const r = Math.round(v * 100) / 100;
	return Object.is(r, -0) ? "0" : String(r);
};
var escapeXml = (s) => s.replace(/[<>&"']/g, (c) => ({
	"<": "&lt;",
	">": "&gt;",
	"&": "&amp;",
	"\"": "&quot;",
	"'": "&#39;"
})[c]);
function compose(scene, effect, palette, opts) {
	const seed = opts.seed ?? hash(opts.title + effect.id);
	const p = "k" + (hash(`${opts.title}|${effect.id}|${palette.id}|${seed}`) % 46656).toString(36);
	const margin = (opts.margin ?? .45) * 100;
	const box = scene.box;
	const view = {
		x0: box.x0 - margin,
		y0: box.y0 - margin,
		x1: box.x1 + margin,
		y1: box.y1 + margin
	};
	if (opts.aspect) {
		const vw = view.x1 - view.x0;
		const vh = view.y1 - view.y0;
		if (vw / vh < opts.aspect) {
			const grow = (vh * opts.aspect - vw) / 2;
			view.x0 -= grow;
			view.x1 += grow;
		} else {
			const grow = (vw / opts.aspect - vh) / 2;
			view.y0 -= grow;
			view.y1 += grow;
		}
	}
	const areas = /* @__PURE__ */ new Map();
	const ctx = {
		pieces: scene.pieces,
		steps: scene.steps,
		box,
		view,
		em: 100,
		palette,
		p,
		rng: mulberry32(seed),
		stagger: (order, spread) => {
			const total = spread ?? Math.min(1.8, .14 * Math.max(1, scene.steps - 1));
			return scene.steps > 1 ? total * order / (scene.steps - 1) : 0;
		},
		sample: (piece, count) => samplePoints(piece.contours, piece.box, count, mulberry32(seed + piece.order * 7919)),
		inside: (piece, x, y) => inside(piece.contours, x, y),
		area: (piece) => {
			if (!areas.has(piece)) areas.set(piece, filledArea(piece.contours, piece.box, 2));
			return areas.get(piece);
		},
		anim: (name, seconds, o = {}) => `animation-name:${p}-${name};animation-duration:${num(seconds)}s;animation-timing-function:${o.ease ?? "cubic-bezier(.22,.7,.2,1)"};animation-iteration-count:${o.loop ? "infinite" : "1"};` + (o.alternate ? "animation-direction:alternate;" : ""),
		at: (seconds, extra = "") => `--d:${num(seconds)}s${extra ? ";" + extra : ""}`,
		n: num
	};
	const out = effect.render(ctx);
	const w = view.x1 - view.x0;
	const h = view.y1 - view.y0;
	const k = (opts.size ?? 960) / Math.max(w, h);
	const width = Math.round(w * k);
	const height = Math.round(h * k);
	const rootStyle = opts.seek !== void 0 ? ` style="--seek:${num(opts.seek)}s;--play:paused"` : "";
	const base = `.${p}-a{animation-delay:calc(var(--d,0s) - var(--seek,0s));animation-play-state:var(--play,running);animation-fill-mode:both}.${p}-b{transform-box:fill-box;transform-origin:center}`;
	const bg = palette.bg === "none" ? "" : `<rect x="${num(view.x0)}" y="${num(view.y0)}" width="${num(w)}" height="${num(h)}" fill="${palette.bg}"/>`;
	return {
		svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${num(view.x0)} ${num(view.y0)} ${num(w)} ${num(h)}" width="${width}" height="${height}" role="img" aria-label="${escapeXml(opts.title)}"${rootStyle}><title>${escapeXml(opts.title)}</title><style>${base}${out.css}</style>` + (out.defs ? `<defs>${out.defs}</defs>` : "") + bg + out.body + `</svg>`,
		duration: out.duration,
		poster: out.poster ?? out.duration,
		loop: !!effect.loop,
		width,
		height
	};
}
/** Returns the same drawing frozen on second `t`: the frame a still or video needs. */
function freezeAt(svg, t) {
	const style = `--seek:${num(t)}s;--play:paused`;
	if (/^<svg[^>]*\sstyle="/.test(svg)) return svg.replace(/^(<svg[^>]*\sstyle=")[^"]*"/, `$1${style}"`);
	return svg.replace(/^<svg /, `<svg style="${style}" `);
}
// src/core/layout.ts
var LAYOUTS = [
	{
		id: "line",
		name: "Line",
		nameAr: "سطر"
	},
	{
		id: "arc",
		name: "Arc",
		nameAr: "قوس"
	},
	{
		id: "circle",
		name: "Circle",
		nameAr: "دائرة"
	},
	{
		id: "mirror",
		name: "Mirror",
		nameAr: "مثنّى"
	}
];
function piece(contours, d, order, ornament = false) {
	const box = contoursBox(contours);
	return {
		d,
		contours,
		box,
		order,
		cx: (box.x0 + box.x1) / 2,
		cy: (box.y0 + box.y1) / 2,
		ornament
	};
}
function affinePiece(cmds, order, f) {
	const moved = mapCmds(cmds, f);
	return piece(flatten(moved), cmdsToD(moved), order);
}
function warpedPiece(cmds, order, f) {
	const contours = flatten(cmds, 1.5).map((c) => c.map(([x, y]) => f(x, y)));
	return piece(contours, contoursToD(contours), order);
}
function readingOrder(shaped) {
	const clusters = /* @__PURE__ */ new Set();
	for (const line of shaped.lines) for (const g of line.glyphs) clusters.add(g.cluster);
	const ranks = /* @__PURE__ */ new Map();
	[...clusters].sort((a, b) => a - b).forEach((c, i) => ranks.set(c, i));
	return ranks;
}
function finish(pieces) {
	let box = emptyBox();
	let steps = 0;
	for (const p of pieces) {
		box = unionBox(box, p.box);
		steps = Math.max(steps, p.order + 1);
	}
	return {
		pieces,
		steps,
		box
	};
}
function eachGlyph(shaped, fn) {
	for (const line of shaped.lines) for (const g of line.glyphs) fn(g, line.width);
}
function layoutLine(shaped) {
	const order = readingOrder(shaped);
	const pieces = [];
	eachGlyph(shaped, (g, width) => {
		const dy = g.line * shaped.lineHeight;
		pieces.push(affinePiece(g.cmds, order.get(g.cluster), (x, y) => [x - width / 2, y + dy]));
	});
	return finish(pieces);
}
function layoutArc(shaped) {
	const order = readingOrder(shaped);
	const widest = Math.max(1, ...shaped.lines.map((l) => l.width));
	const radius = widest / Math.min(2.6, Math.max(1.8, widest / 240));
	const pieces = [];
	eachGlyph(shaped, (g, width) => {
		const r0 = radius - g.line * shaped.lineHeight;
		pieces.push(warpedPiece(g.cmds, order.get(g.cluster), (x, y) => {
			const phi = (x - width / 2) / radius;
			const r = r0 - y;
			return [r * Math.sin(phi), radius - r * Math.cos(phi)];
		}));
	});
	return finish(pieces);
}
/** An eight-pointed star (two overlapping squares), a classic centre ornament. */
function star(cx, cy, r) {
	const square = (rot) => [
		0,
		1,
		2,
		3
	].map((k) => {
		const a = rot + k * Math.PI / 2;
		return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
	});
	const inner = (rot) => [
		0,
		1,
		2,
		3
	].map((k) => {
		const a = rot - k * Math.PI / 2;
		return [cx + r * .42 * Math.cos(a), cy + r * .42 * Math.sin(a)];
	});
	return [
		square(0),
		square(Math.PI / 4),
		inner(0),
		inner(Math.PI / 4)
	];
}
function layoutCircle(shaped) {
	const order = readingOrder(shaped);
	const glyphs = shaped.lines.flatMap((l, i) => {
		const before = shaped.lines.slice(0, i).reduce((s, x) => s + x.width + 50, 0);
		return l.glyphs.map((g) => ({
			g,
			x0: before
		}));
	});
	const width = shaped.lines.reduce((s, l) => s + l.width, 0) + 50 * (shaped.lines.length - 1);
	const gap = 45;
	let repeats = 1;
	while (repeats < 8 && repeats * (width + gap) / (2 * Math.PI) < 170) repeats++;
	const length = repeats * (width + gap);
	const radius = length / (2 * Math.PI);
	const steps = order.size;
	const pieces = [];
	for (let rep = 0; rep < repeats; rep++) {
		const start = rep * (width + gap);
		for (const { g, x0 } of glyphs) pieces.push(warpedPiece(g.cmds, rep * steps + order.get(g.cluster), (x, y) => {
			const phi = (start + x0 + x) / length * 2 * Math.PI;
			const r = radius - y;
			return [r * Math.sin(phi), -r * Math.cos(phi)];
		}));
	}
	const starContours = star(0, 0, Math.max(25, (radius - shaped.descent) * .42));
	pieces.push(piece(starContours, contoursToD(starContours), repeats * steps, true));
	return finish(pieces);
}
function layoutMirror(shaped) {
	const line = layoutLine(shaped);
	const shift = 4 - line.box.x0;
	const pieces = [];
	for (const p of line.pieces) {
		const right = p.contours.map((c) => c.map(([x, y]) => [x + shift, y]));
		const left = p.contours.map((c) => c.map(([x, y]) => [-(x + shift), y]).reverse());
		pieces.push(piece(right, translateD(p.d, shift, 1), p.order));
		pieces.push(piece(left, translateD(p.d, shift, -1), p.order));
	}
	return finish(pieces);
}
/** Moves a path horizontally, optionally mirroring it around x = 0. */
function translateD(d, dx, sign) {
	const cmds = [];
	for (const m of d.matchAll(/([MLQCZ])([^MLQCZ]*)/g)) {
		const values = m[2].trim() ? m[2].trim().split(/[\s,]+/).map(Number) : [];
		cmds.push({
			type: m[1],
			values
		});
	}
	return cmdsToD(mapCmds(cmds, (x, y) => [sign * (x + dx), y]));
}
function layout(id, shaped) {
	switch (id) {
		case "arc": return layoutArc(shaped);
		case "circle": return layoutCircle(shaped);
		case "mirror": return layoutMirror(shaped);
		default: return layoutLine(shaped);
	}
}
// src/effects/bleed.ts
/** Wet ink spreads into the paper, then settles into a crisp letter. */
var bleed = {
	id: "bleed",
	name: "Ink bleed",
	nameAr: "حبر",
	blurb: "Wet ink soaks into the paper, then dries sharp.",
	palette: "paper",
	render(ctx) {
		const { p, palette, at, anim } = ctx;
		const defs = `<filter id="${p}-wet" x="-30%" y="-30%" width="160%" height="160%"><feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="7"/><feGaussianBlur stdDeviation="2.2"/></filter>`;
		const css = `.${p}-w{fill:${palette.ink};filter:url(#${p}-wet);${anim("w", 1.4, { ease: "ease-out" })}}.${p}-s{fill:${palette.ink};${anim("s", .8, { ease: "ease-in-out" })}}@keyframes ${p}-w{0%{opacity:0;transform:scale(.92)}35%{opacity:.85}100%{opacity:0;transform:scale(1.06)}}@keyframes ${p}-s{from{opacity:0}to{opacity:1}}`;
		let body = "";
		let end = 0;
		for (const piece of ctx.pieces) {
			const d = ctx.stagger(piece.order);
			body += `<path class="${p}-a ${p}-b ${p}-w" d="${piece.d}" style="${at(d)}"/>`;
			body += `<path class="${p}-a ${p}-s" d="${piece.d}" style="${at(d + .45)}"/>`;
			end = Math.max(end, d + 1.4);
		}
		return {
			css,
			defs,
			body,
			duration: end + .5
		};
	}
};
// src/effects/gold.ts
/** Letters rise in gold leaf, then a light sweeps across them, again and again. */
var gold = {
	id: "gold",
	name: "Gold leaf",
	nameAr: "ذهب",
	blurb: "Gold letters with a light that keeps sweeping across.",
	palette: "night",
	loop: true,
	render(ctx) {
		const { p, box, at, anim, n } = ctx;
		const w = box.x1 - box.x0;
		const h = box.y1 - box.y0;
		const band = Math.max(ctx.em * .6, w * .22);
		const defs = `<linearGradient id="${p}-g" x1="0" y1="${n(box.y0)}" x2="0" y2="${n(box.y1)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff1b8"/><stop offset=".35" stop-color="#e2b04a"/><stop offset=".6" stop-color="#9c6b1c"/><stop offset=".8" stop-color="#e9c46a"/><stop offset="1" stop-color="#7a5212"/></linearGradient><linearGradient id="${p}-s" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><clipPath id="${p}-c">${ctx.pieces.map((q) => `<path d="${q.d}"/>`).join("")}</clipPath>`;
		const intro = ctx.stagger(ctx.steps - 1) + .9;
		const sweep = 2.8;
		const css = `.${p}-l{fill:url(#${p}-g);${anim("l", .9)}}.${p}-sh{fill:#000;opacity:.35;${anim("sh", .9)}}.${p}-x{${anim("x", sweep, {
			loop: true,
			ease: "cubic-bezier(.5,0,.3,1)"
		})}}@keyframes ${p}-l{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}@keyframes ${p}-sh{from{opacity:0}to{opacity:.35}}@keyframes ${p}-x{0%{transform:translateX(0)}55%,100%{transform:translateX(${n(w + band * 2)}px)}}`;
		let shadow = "";
		let letters = "";
		for (const piece of ctx.pieces) {
			const d = ctx.stagger(piece.order);
			shadow += `<path class="${p}-a ${p}-sh" d="${piece.d}" transform="translate(1.2 1.8)" style="${at(d)}"/>`;
			letters += `<path class="${p}-a ${p}-l" d="${piece.d}" style="${at(d)}"/>`;
		}
		const shine = `<g clip-path="url(#${p}-c)"><rect class="${p}-a ${p}-x" x="${n(box.x0 - band * 2)}" y="${n(box.y0)}" width="${n(band)}" height="${n(h)}" fill="url(#${p}-s)" style="${at(intro)}"/></g>`;
		return {
			css,
			defs,
			body: shadow + letters + shine,
			duration: intro + sweep,
			poster: intro + sweep * .3
		};
	}
};
// src/effects/ink.ts
/** A pen traces each letter's outline from right to left, then the ink fills in. */
var ink = {
	id: "ink",
	name: "Pen",
	nameAr: "قلم",
	blurb: "A pen traces every letter, then the ink fills in.",
	palette: "paper",
	render(ctx) {
		const { p, palette, at, anim } = ctx;
		const trace = 1.1;
		const fill = .7;
		const css = `.${p}-t{fill:none;stroke:${palette.ink};stroke-width:1.3;stroke-linejoin:round;stroke-linecap:round;stroke-dasharray:1;${anim("t", trace, { ease: "cubic-bezier(.45,.05,.35,1)" })}}.${p}-f{fill:${palette.ink};${anim("f", fill)}}@keyframes ${p}-t{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}@keyframes ${p}-f{from{fill-opacity:0}to{fill-opacity:1}}`;
		let body = "";
		let end = 0;
		for (const piece of ctx.pieces) {
			const d = ctx.stagger(piece.order);
			body += `<path class="${p}-a ${p}-t" pathLength="1" d="${piece.d}" style="${at(d)}"/>`;
			body += `<path class="${p}-a ${p}-f" d="${piece.d}" style="${at(d + trace * .8)}"/>`;
			end = Math.max(end, d + trace * .8 + fill);
		}
		return {
			css,
			body,
			duration: end + .6
		};
	}
};
// src/effects/lantern.ts
/** Warm lantern light: the words glow and sparks drift up around them. */
var lantern = {
	id: "lantern",
	name: "Lantern",
	nameAr: "فانوس",
	blurb: "A warm glow and sparks drifting up, for Ramadan nights.",
	palette: "night",
	loop: true,
	render(ctx) {
		const { p, palette, box, at, anim, n, em, rng } = ctx;
		const defs = `<filter id="${p}-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter><radialGradient id="${p}-sp"><stop offset="0" stop-color="#fff6d6"/><stop offset=".5" stop-color="${palette.accent}"/><stop offset="1" stop-color="${palette.accent}" stop-opacity="0"/></radialGradient>`;
		const css = `.${p}-in{${anim("in", 1.2, { ease: "ease-out" })}}.${p}-gl{fill:${palette.accent};${anim("gl", 3, {
			loop: true,
			ease: "ease-in-out"
		})}}.${p}-sp{${anim("sp", 4, {
			loop: true,
			ease: "linear"
		})}}@keyframes ${p}-in{from{opacity:0}to{opacity:1}}@keyframes ${p}-gl{0%,100%{opacity:.45}50%{opacity:.95}}@keyframes ${p}-sp{0%{opacity:0;transform:translate(0,0)}15%{opacity:1}100%{opacity:0;transform:translate(var(--x),var(--y))}}`;
		const shapes = ctx.pieces.map((q) => `<path d="${q.d}"/>`).join("");
		let body = `<g class="${p}-a ${p}-in" style="${at(0)}"><g filter="url(#${p}-glow)"><g class="${p}-a ${p}-gl" style="${at(0)}">${shapes}</g></g><g fill="${palette.ink}">${shapes}</g></g>`;
		const w = box.x1 - box.x0;
		for (let i = 0; i < 34; i++) {
			const x = box.x0 + rng() * w;
			const y = box.y1 - rng() * (box.y1 - box.y0) * .4;
			body += `<circle class="${p}-a ${p}-sp" cx="${n(x)}" cy="${n(y)}" r="${n(.8 + rng() * 1.6)}" fill="url(#${p}-sp)" style="${at(-rng() * 4, `--x:${n((rng() - .5) * em * .5)}px;--y:${n(-em * (.6 + rng() * .9))}px`)}"/>`;
		}
		return {
			css,
			defs,
			body,
			duration: 6,
			poster: 2.2
		};
	}
};
// src/effects/mosaic.ts
/** Zellige tiles spin into place, a wave spreading out from the centre. */
var mosaic = {
	id: "mosaic",
	name: "Zellige",
	nameAr: "فسيفساء",
	blurb: "Little tiles spin into place, like a Moroccan wall.",
	palette: "zellige",
	render(ctx) {
		const { p, palette, box, at, anim, n } = ctx;
		const cell = ctx.em * .075;
		const tile = cell * .84;
		const css = `.${p}-t{${anim("t", .7, { ease: "cubic-bezier(.3,1.5,.5,1)" })}}@keyframes ${p}-t{from{opacity:0;transform:rotate(45deg) scale(0)}to{opacity:1;transform:none}}`;
		const defs = `<clipPath id="${p}-c">${ctx.pieces.map((q) => `<path d="${q.d}"/>`).join("")}</clipPath>`;
		const cx = (box.x0 + box.x1) / 2;
		const cy = (box.y0 + box.y1) / 2;
		const reach = Math.hypot(box.x1 - cx, box.y1 - cy) || 1;
		const colors = [
			palette.ink,
			palette.ink,
			palette.accent,
			palette.ink,
			mix(palette.ink, palette.bg)
		];
		let tiles = "";
		let i = 0;
		for (let y = box.y0; y < box.y1; y += cell) {
			let j = 0;
			for (let x = box.x0; x < box.x1; x += cell) {
				const mx = x + cell / 2;
				const my = y + cell / 2;
				if (ctx.pieces.some((q) => mx >= q.box.x0 - cell && mx <= q.box.x1 + cell && my >= q.box.y0 - cell && my <= q.box.y1 + cell && [
					[mx, my],
					[x, y],
					[x + cell, y],
					[x, y + cell],
					[x + cell, y + cell]
				].some(([a, b]) => ctx.inside(q, a, b)))) {
					const delay = Math.hypot(mx - cx, my - cy) / reach * 1.6;
					const color = colors[(i * 3 + j * 7 + i * j % 5) % colors.length];
					tiles += `<rect class="${p}-a ${p}-b ${p}-t" x="${n(x)}" y="${n(y)}" width="${n(tile)}" height="${n(tile)}" fill="${color}" style="${at(delay)}"/>`;
				}
				j++;
			}
			i++;
		}
		return {
			css,
			defs,
			body: `<g clip-path="url(#${p}-c)">${tiles}</g>`,
			duration: 2.9
		};
	}
};
function mix(a, b) {
	if (!a.startsWith("#") || !b.startsWith("#")) return a;
	const pa = parseInt(a.slice(1), 16);
	const pb = parseInt(b.slice(1), 16);
	const ch = (s) => Math.round(((pa >> s & 255) + (pb >> s & 255)) / 2);
	return "#" + (ch(16) << 16 | ch(8) << 8 | ch(0)).toString(16).padStart(6, "0");
}
// src/effects/index.ts
var EFFECTS = [
	ink,
	gold,
	bleed,
	mosaic,
	{
		id: "sand",
		name: "Sand",
		nameAr: "رمل",
		blurb: "Grains blow in on the wind and gather into letters.",
		palette: "desert",
		render(ctx) {
			const { p, palette, at, anim, n, rng } = ctx;
			const fly = 1.7;
			const css = `.${p}-g{${anim("g", fly, { ease: "cubic-bezier(.3,.6,.2,1)" })}}.${p}-f{fill:${palette.ink};${anim("f", .6)}}@keyframes ${p}-g{0%{opacity:0;transform:translate(var(--x),var(--y))}12%{opacity:1}72%{opacity:1;transform:none}100%{opacity:0;transform:none}}@keyframes ${p}-f{from{opacity:0}to{opacity:1}}`;
			const total = ctx.pieces.reduce((s, q) => s + ctx.area(q), 0) || 1;
			const budget = 900;
			let grains = "";
			let letters = "";
			let end = 0;
			for (const piece of ctx.pieces) {
				const d = ctx.stagger(piece.order, 1.1);
				const count = Math.max(6, Math.round(budget * ctx.area(piece) / total));
				for (const [x, y] of ctx.sample(piece, count)) {
					const dx = ctx.em * (.8 + rng() * 2.2);
					const dy = ctx.em * (rng() - .5) * 1.4;
					const color = rng() < .25 ? palette.accent : palette.ink;
					grains += `<circle class="${p}-a ${p}-g" cx="${n(x)}" cy="${n(y)}" r="${n(.5 + rng() * .6)}" fill="${color}" style="${at(d + rng() * .4, `--x:${n(dx)}px;--y:${n(dy)}px`)}"/>`;
				}
				letters += `<path class="${p}-a ${p}-f" d="${piece.d}" style="${at(d + fly * .62)}"/>`;
				end = Math.max(end, d + .4 + fly);
			}
			return {
				css,
				body: letters + grains,
				duration: end + .4
			};
		}
	},
	{
		id: "neon",
		name: "Neon",
		nameAr: "نيون",
		blurb: "Glowing tubes flicker on, then hum softly.",
		palette: "neon",
		loop: true,
		render(ctx) {
			const { p, palette, at, anim } = ctx;
			const defs = `<filter id="${p}-glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2.6" result="b"/><feGaussianBlur in="SourceGraphic" stdDeviation="7" result="c"/><feMerge><feMergeNode in="c"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
			const hum = 2.4;
			const css = `.${p}-tube{fill:none;stroke:${palette.ink};stroke-width:1.7;stroke-linejoin:round;${anim("on", .9, { ease: "steps(1,end)" })}}.${p}-echo{fill:none;stroke:${palette.accent};stroke-width:.7;opacity:.55;${anim("on", .9, { ease: "steps(1,end)" })}}.${p}-hum{${anim("hum", hum, {
				loop: true,
				ease: "ease-in-out"
			})}}@keyframes ${p}-on{0%{opacity:0}15%{opacity:.9}25%{opacity:.1}40%{opacity:1}55%{opacity:.35}70%,100%{opacity:1}}@keyframes ${p}-hum{0%,100%{opacity:1}50%{opacity:.82}}`;
			let tubes = "";
			let end = 0;
			for (const piece of ctx.pieces) {
				const d = ctx.stagger(piece.order, 1.2) + ctx.rng() * .35;
				tubes += `<path class="${p}-a ${p}-echo" d="${piece.d}" transform="translate(1.6 1.2)" style="${at(d)}"/>`;
				tubes += `<path class="${p}-a ${p}-tube" d="${piece.d}" style="${at(d)}"/>`;
				end = Math.max(end, d + .9);
			}
			return {
				css,
				defs,
				body: `<g filter="url(#${p}-glow)"><g class="${p}-a ${p}-hum" style="${at(end)}">${tubes}</g></g>`,
				duration: end + hum,
				poster: end + .2
			};
		}
	},
	{
		id: "stars",
		name: "Stars",
		nameAr: "نجوم",
		blurb: "Words made of twinkling stars on a night sky.",
		palette: "night",
		loop: true,
		render(ctx) {
			const { p, palette, at, anim, n, rng } = ctx;
			const css = `.${p}-in{${anim("in", .8, { ease: "ease-out" })}}.${p}-tw{${anim("tw", 2.2, {
				loop: true,
				ease: "ease-in-out"
			})}}.${p}-ghost{fill:${palette.ink};opacity:.07}@keyframes ${p}-in{from{opacity:0;transform:scale(0)}to{opacity:1;transform:none}}@keyframes ${p}-tw{0%,100%{opacity:1}50%{opacity:.25}}`;
			const total = ctx.pieces.reduce((s, q) => s + ctx.area(q), 0) || 1;
			let body = ctx.pieces.map((q) => `<path class="${p}-ghost" d="${q.d}"/>`).join("");
			let end = 0;
			for (const piece of ctx.pieces) {
				const d = ctx.stagger(piece.order, 1.4);
				const count = Math.max(4, Math.round(520 * ctx.area(piece) / total));
				for (const [x, y] of ctx.sample(piece, count)) {
					const r = rng() < .12 ? 1.4 + rng() * .8 : .45 + rng() * .6;
					const color = rng() < .2 ? palette.accent : palette.ink;
					const dot = `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${color}"/>`;
					body += `<g class="${p}-a ${p}-b ${p}-in" style="${at(d + rng() * .5)}"><g class="${p}-a ${p}-tw" style="${at(-rng() * 2.2)}">${dot}</g></g>`;
					end = Math.max(end, d + 1.3);
				}
			}
			return {
				css,
				body,
				duration: end + 2.2,
				poster: end + .3
			};
		}
	},
	lantern,
	{
		id: "rise",
		name: "Rise",
		nameAr: "نهوض",
		blurb: "Letters float up into place and a swash underlines them.",
		palette: "night",
		render(ctx) {
			const { p, palette, box, at, anim, n, em } = ctx;
			const up = .9;
			const css = `.${p}-u{fill:${palette.ink};${anim("u", up, { ease: "cubic-bezier(.2,1.25,.4,1)" })}}.${p}-s{fill:none;stroke:${palette.accent};stroke-width:2.4;stroke-linecap:round;stroke-dasharray:1;${anim("s", 1.1, { ease: "cubic-bezier(.6,0,.2,1)" })}}@keyframes ${p}-u{from{opacity:0;transform:translateY(${n(em * .28)}px) scale(.94)}to{opacity:1;transform:none}}@keyframes ${p}-s{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}`;
			let body = "";
			let end = 0;
			for (const piece of ctx.pieces) {
				const d = ctx.stagger(piece.order);
				body += `<path class="${p}-a ${p}-b ${p}-u" d="${piece.d}" style="${at(d)}"/>`;
				end = Math.max(end, d + up);
			}
			const y = box.y1 + em * .14;
			const w = box.x1 - box.x0;
			const swash = `M${n(box.x1 + em * .05)} ${n(y - em * .08)}C${n(box.x1 - w * .25)} ${n(y + em * .12)} ${n(box.x0 + w * .3)} ${n(y + em * .1)} ${n(box.x0 + w * .12)} ${n(y - em * .02)}S${n(box.x0 - em * .05)} ${n(y - em * .18)} ${n(box.x0 + w * .02)} ${n(y - em * .12)}`;
			body += `<path class="${p}-a ${p}-s" pathLength="1" d="${swash}" style="${at(end - .2)}"/>`;
			return {
				css,
				body,
				duration: end + 1.4
			};
		}
	},
	{
		id: "stamp",
		name: "Seal",
		nameAr: "ختم",
		blurb: "Pressed down like a seal, with a frame and ink speckles.",
		palette: "paper",
		render(ctx) {
			const { p, palette, box, at, anim, n, em, rng } = ctx;
			const pad = em * .18;
			const x0 = box.x0 - pad;
			const y0 = box.y0 - pad;
			const w = box.x1 - box.x0 + pad * 2;
			const h = box.y1 - box.y0 + pad * 2;
			const css = `.${p}-m{${anim("m", .55, { ease: "cubic-bezier(.5,0,.75,0)" })}}.${p}-k{fill:${palette.accent}}.${p}-fr{fill:none;stroke:${palette.accent};stroke-dasharray:1;${anim("fr", .7, { ease: "ease-out" })}}.${p}-dot{fill:${palette.accent};${anim("dot", .35, { ease: "cubic-bezier(.3,1.6,.5,1)" })}}@keyframes ${p}-m{0%{opacity:0;transform:scale(1.9) rotate(-7deg)}70%{opacity:1;transform:scale(.97) rotate(1deg)}100%{opacity:1;transform:none}}@keyframes ${p}-fr{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}@keyframes ${p}-dot{from{opacity:0;transform:scale(0)}to{opacity:.8;transform:none}}`;
			const letters = ctx.pieces.map((q) => `<path class="${p}-k" d="${q.d}"/>`).join("");
			let body = `<g class="${p}-a ${p}-b ${p}-m" style="${at(0)}">${letters}</g>`;
			const r = em * .12;
			body += `<rect class="${p}-a ${p}-fr" pathLength="1" x="${n(x0)}" y="${n(y0)}" width="${n(w)}" height="${n(h)}" rx="${n(r)}" stroke-width="3" style="${at(.5)}"/>`;
			body += `<rect class="${p}-a ${p}-fr" pathLength="1" x="${n(x0 + 5)}" y="${n(y0 + 5)}" width="${n(w - 10)}" height="${n(h - 10)}" rx="${n(r * .7)}" stroke-width="1" style="${at(.62)}"/>`;
			for (let i = 0; i < 26; i++) {
				const side = rng();
				const t = rng();
				const x = side < .5 ? x0 + t * w : side < .75 ? x0 - rng() * em * .15 : x0 + w + rng() * em * .15;
				const y = side < .25 ? y0 - rng() * em * .15 : side < .5 ? y0 + h + rng() * em * .15 : y0 + rng() * h;
				body += `<circle class="${p}-a ${p}-b ${p}-dot" cx="${n(x)}" cy="${n(y)}" r="${n(.4 + rng() * 1.3)}" style="${at(.48 + rng() * .25)}"/>`;
			}
			return {
				css,
				body,
				duration: 1.9
			};
		}
	},
	{
		id: "reveal",
		name: "Reveal",
		nameAr: "كشف",
		blurb: "A pen edge sweeps right to left and uncovers the words.",
		palette: "desert",
		render(ctx) {
			const { p, palette, box, at, anim, n, em } = ctx;
			const pad = em * .15;
			const x0 = box.x0 - pad;
			const x1 = box.x1 + pad;
			const y0 = box.y0 - pad;
			const h = box.y1 - box.y0 + pad * 2;
			const w = x1 - x0;
			const sweep = 1.8;
			const ease = "cubic-bezier(.65,0,.35,1)";
			const defs = `<clipPath id="${p}-c"><rect class="${p}-a ${p}-m" x="${n(x0)}" y="${n(y0)}" width="${n(w)}" height="${n(h)}" style="${at(.1)}"/></clipPath>`;
			const css = `.${p}-m{transform-box:fill-box;transform-origin:right center;${anim("m", sweep, { ease })}}.${p}-e{stroke:${palette.accent};stroke-width:2.2;stroke-linecap:round;${anim("e", sweep, { ease })}}@keyframes ${p}-m{from{transform:scaleX(0)}to{transform:scaleX(1)}}@keyframes ${p}-e{0%{opacity:0;transform:translateX(0)}8%{opacity:1}92%{opacity:1}100%{opacity:0;transform:translateX(-${n(w)}px)}}`;
			const letters = ctx.pieces.map((q) => `<path d="${q.d}"/>`).join("");
			return {
				css,
				defs,
				body: `<g clip-path="url(#${p}-c)" fill="${palette.ink}">${letters}</g><line class="${p}-a ${p}-e" x1="${n(x1)}" y1="${n(y0)}" x2="${n(x1)}" y2="${n(y0 + h)}" style="${at(.1)}"/>`,
				duration: 2.5
			};
		}
	},
	{
		id: "wave",
		name: "Wave",
		nameAr: "موج",
		blurb: "Letters ride a slow wave, one after another.",
		palette: "zellige",
		loop: true,
		render(ctx) {
			const { p, palette, at, anim, em } = ctx;
			const period = 2.6;
			const lift = em * .07;
			const defs = `<filter id="${p}-soft" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="3"/></filter>`;
			const css = `.${p}-w{fill:${palette.ink};${anim("w", period, {
				loop: true,
				ease: "ease-in-out"
			})}}.${p}-r{fill:${palette.ink};${anim("r", period, {
				loop: true,
				ease: "ease-in-out"
			})}}@keyframes ${p}-w{0%,100%{transform:translateY(0)}25%{transform:translateY(-${lift}px)}75%{transform:translateY(${lift}px)}}@keyframes ${p}-r{0%,100%{opacity:.14}25%{opacity:.06}75%{opacity:.24}}`;
			let shadows = "";
			let letters = "";
			for (const piece of ctx.pieces) {
				const d = -(piece.order % 12 / 12) * period;
				shadows += `<path class="${p}-a ${p}-r" d="${piece.d}" style="${at(d)}"/>`;
				letters += `<path class="${p}-a ${p}-w" d="${piece.d}" style="${at(d)}"/>`;
			}
			return {
				css,
				defs,
				body: `<g filter="url(#${p}-soft)" transform="translate(0 ${em * .12})">${shadows}</g>${letters}`,
				duration: period * 2,
				poster: period * .4
			};
		}
	}
];
var effectById = (id) => EFFECTS.find((e) => e.id === id) ?? EFFECTS[0];
// src/core/engine.ts
var Khatt = class {
	fonts = /* @__PURE__ */ new Map();
	load;
	constructor(load) {
		this.load = load;
	}
	font(styleId) {
		const style = styleById(styleId);
		let font = this.fonts.get(style.id);
		if (!font) {
			font = this.load(style.file).then((bytes) => new ShapingFont(bytes));
			this.fonts.set(style.id, font);
			font.catch(() => this.fonts.delete(style.id));
		}
		return font;
	}
	async render(opts) {
		const text = cleanText(opts.text);
		const font = await this.font(opts.style ?? "ruqaa");
		const effect = typeof opts.effect === "object" ? opts.effect : effectById(opts.effect ?? "ink");
		const palette = typeof opts.palette === "object" ? opts.palette : paletteById(opts.palette ?? effect.palette);
		return compose(layout(opts.layout ?? "line", font.shape(text)), effect, palette, {
			title: text,
			seek: opts.seek,
			size: opts.size,
			seed: opts.seed,
			aspect: opts.aspect
		});
	}
};
/** Trims each line and drops empty ones; falls back to a greeting. */
function cleanText(text) {
	const lines = text.replace(/\r/g, "").split("\n").map((l) => l.trim().replace(/\s+/g, " ")).filter(Boolean);
	return lines.length ? lines.slice(0, 4).join("\n") : "سلام";
}
// bin/khatt.ts
var HELP = `khatt: animated Arabic calligraphy

Usage:
  khatt "سلام" [options]

Options:
  -s, --style <id>     ${STYLES.map((s) => s.id).join(", ")} (default ruqaa)
  -l, --layout <id>    ${LAYOUTS.map((l) => l.id).join(", ")} (default line)
  -e, --effect <id>    ${EFFECTS.map((e) => e.id).join(", ")}, or a path to your own .mjs effect
  -p, --palette <id>   ${PALETTES.map((p) => p.id).join(", ")} (default: the effect's own)
      --ink <color>    override the ink colour
      --accent <color> override the accent colour
      --bg <color>     override the background ("none" for transparent)
  -o, --out <file>     output file, .svg or .html (default khatt.svg)
      --still          freeze on the finished drawing instead of animating
      --list           show every style, layout, effect and palette
  -h, --help           show this help

Use \\n in the text for a new line.`;
var fontsDir = new URL("../fonts/", import.meta.url);
async function main() {
	const { values, positionals } = parseArgs({
		allowPositionals: true,
		options: {
			style: {
				type: "string",
				short: "s"
			},
			layout: {
				type: "string",
				short: "l"
			},
			effect: {
				type: "string",
				short: "e"
			},
			palette: {
				type: "string",
				short: "p"
			},
			ink: { type: "string" },
			accent: { type: "string" },
			bg: { type: "string" },
			out: {
				type: "string",
				short: "o"
			},
			still: { type: "boolean" },
			list: { type: "boolean" },
			help: {
				type: "boolean",
				short: "h"
			}
		}
	});
	if (values.help) return void console.log(HELP);
	if (values.list) return void console.log(listing());
	const text = positionals.join(" ").replace(/\\n/g, "\n");
	if (!text.trim()) {
		console.log(HELP);
		process.exitCode = 1;
		return;
	}
	const effect = await pickEffect(values.effect);
	const base = PALETTES.find((p) => p.id === (values.palette ?? effect.palette)) ?? PALETTES[0];
	const palette = {
		...base,
		ink: values.ink ?? base.ink,
		accent: values.accent ?? base.accent,
		bg: values.bg ?? base.bg
	};
	const out = await new Khatt((file) => readFile(new URL(file, fontsDir))).render({
		text,
		style: values.style,
		layout: values.layout,
		effect,
		palette
	});
	const svg = values.still ? freezeAt(out.svg, out.poster) : out.svg;
	const file = values.out ?? "khatt.svg";
	const content = file.endsWith(".html") ? page(text, svg, palette.bg) : svg;
	await writeFile(file, content);
	console.log(`Wrote ${file} (${(content.length / 1024).toFixed(0)} KB, ${out.duration.toFixed(1)} s${out.loop ? ", loops" : ""})`);
}
async function pickEffect(id) {
	if (id && /[\\/.]/.test(id)) {
		const mod = await import(pathToFileURL(resolve(id)).href);
		const effect = mod.default ?? mod.effect;
		if (!effect || typeof effect.render !== "function") throw new Error(`${id} does not export an effect`);
		return effect;
	}
	const found = EFFECTS.find((e) => e.id === (id ?? "ink"));
	if (!found) throw new Error(`Unknown effect "${id}". Run khatt --list to see them all.`);
	return found;
}
function listing() {
	const rows = (title, items) => `${title}\n` + items.map((i) => `  ${i.id.padEnd(9)} ${i.name} · ${i.nameAr}${i.blurb ? `  ${i.blurb}` : ""}`).join("\n");
	return [
		rows("Styles", STYLES),
		rows("Layouts", LAYOUTS),
		rows("Effects", EFFECTS),
		rows("Palettes", PALETTES)
	].join("\n\n");
}
function page(title, svg, bg) {
	const color = bg === "none" ? "#ffffff" : bg;
	return `<!doctype html><html lang="ar"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title.replace(/[<&]/g, "")}</title>
<style>html,body{margin:0;height:100%;background:${color}}body{display:grid;place-items:center}svg{width:min(92vw,1100px);height:auto;max-height:92vh}</style>
</head><body onclick="location.reload()">${svg}</body></html>
`;
}
main().catch((err) => {
	console.error(err instanceof Error ? err.message : err);
	process.exitCode = 1;
});
export {};
