/**
 * Creates a shim that allows for the registration of custom Journal Entry sheets.
 *
 * Requires libWrapper (or libWrapper shim).
 *
 * This method works the same as the @see Actor.registerSheet method,
 * which indirectly calls @see EntitySheetConfig.registerSheet
 *
 * The first argument is the "scope" or namespace of your sheet, and
 * the second argument is the class of the sheet itself. The third argument
 * is an object of additional data.
 *
 * @example
 * Journal.registerSheet?.("myModule", SheetApplicationClass, {
 *     types: ["base"],
 *     makeDefault: false,
 *     label: "My Journal Entry sheet"
 * });
 *
 */
function _initializeJournalSheetShim() {
	function _getSheetClass() {
		const cfg = CONFIG[this.documentName];
		const sheets = cfg.sheetClasses[this.type] || {};
		const override = this.getFlag("core", "sheetClass");
		if (sheets[override]) return sheets[override].cls;
		const classes = Object.values(sheets);
		if (!classes.length) return null;
		return (classes.find(s => s.default) ?? classes.pop()).cls;
	}

	JournalEntry.prototype.type = "base";

	libWrapper.register("_extended-journal-sheets", "JournalEntry.prototype._getSheetClass", _getSheetClass, "OVERRIDE");

	/**
	 * Register a sheet class as a candidate which can be used to display Journal Entries.
	 *
	 * @param {string} scope            Provide a unique namespace scope for this sheet
	 * @param {Application} sheetClass  A defined Application class used to render the sheet
	 * @param {Object} options          Additional options used for sheet registration
	 * @param {string} [options.label]          A human readable label for the sheet name, which will be localized
	 * @param {string[]} [options.types]        An array of entity types for which this sheet should be used
	 * @param {boolean} [options.makeDefault]   Whether to make this sheet the default for provided types
	 *
	 * @example
	 * Journal.registerSheet?.("myModule", SheetApplicationClass, {
	 *     types: ["base"],
	 *     makeDefault: false,
	 *     label: "My Journal Entry sheet"
	 * });
	 */
	Journal.registerSheet = function (...args) {
		EntitySheetConfig.registerSheet(JournalEntry, ...args);
	}

	/**
	 * Unregister a Journal Entry sheet class, removing it from the list of available Applications to use for Journal Entries.
	 *
	 * @param {string} scope            Provide a unique namespace scope for this sheet
	 * @param {Application} sheetClass  A defined Application class used to render the sheet
	 * @param {Object} [options]          Additional options used for sheet registration
	 * @param {string[]} [options.types]             An Array of types for which this sheet should be removed
	 *
	 * @example
	 * Journal.unregisterSheet?.("myModule", SheetApplicationClass, {
	 * 	types: ["base"],
	 * });
	 */
	Journal.unregisterSheet = function (...args) {
		EntitySheetConfig.unregisterSheet(JournalEntry, ...args)
	}

	CONFIG.JournalEntry.sheetClasses = {
		"base": {                                  // "base" because there is only one type of Journal
			"JournalSheet": {                        // Register the default sheet
				id: "JournalSheet",
				default: true,                         // As the default
				label: "JournalSheet",
				cls: CONFIG.JournalEntry.sheetClass
			}
		}
	}
}

/**************************************** libWrapper shim **********************************************/
// SPDX-License-Identifier: MIT
// Copyright © 2021 fvtt-lib-wrapper Rui Pinheiro


'use strict';

// A shim for the libWrapper library
export let libWrapper = undefined;

export const VERSIONS = [1, 8, 0];
export const TGT_SPLIT_RE = new RegExp("([^.[]+|\\[('([^']|\\'|\\\\)+?'|\"([^\"]|\\\"|\\\\)+?\")\\])", 'g');
export const TGT_CLEANUP_RE = new RegExp("(^\\['|'\\]$|^\\[\"|\"\\]$)", 'g');

// Main shim code
Hooks.once('init', () => {
	// Check if the real module is already loaded - if so, use it
	if (globalThis.libWrapper && !(globalThis.libWrapper.is_fallback ?? true)) {
		libWrapper = globalThis.libWrapper;
		return;
	}

	// Fallback implementation
	libWrapper = class {
		static get is_fallback() { return true };

		static register(package_id, target, fn, type = "MIXED", { chain = undefined } = {}) {
			const is_setter = target.endsWith('#set');
			target = !is_setter ? target : target.slice(0, -4);
			const split = target.match(TGT_SPLIT_RE).map((x) => x.replace(/\\(.)/g, '$1').replace(TGT_CLEANUP_RE, ''));
			const fn_name = split.pop();
			const root_nm = split.splice(0, 1)[0];
			const _eval = eval; // The browser doesn't expose all global variables (e.g. 'Game') inside globalThis, but it does to an eval. We copy it to a variable to have it run in global scope.
			const obj = split.reduce((x, y) => x[y], globalThis[root_nm] ?? _eval(root_nm));

			let iObj = obj;
			let descriptor = null;
			while (iObj) {
				descriptor = Object.getOwnPropertyDescriptor(iObj, fn_name);
				if (descriptor) break;
				iObj = Object.getPrototypeOf(iObj);
			}
			if (!descriptor || descriptor?.configurable === false) throw `libWrapper Shim: '${target}' does not exist, could not be found, or has a non-configurable descriptor.`;

			let original = null;
			const wrapper = (chain ?? type != 'OVERRIDE') ? function () { return fn.call(this, original.bind(this), ...arguments); } : function () { return fn.apply(this, arguments); };

			if (!is_setter) {
				if (descriptor.value) {
					original = descriptor.value;
					descriptor.value = wrapper;
				}
				else {
					original = descriptor.get;
					descriptor.get = wrapper;
				}
			}
			else {
				if (!descriptor.set) throw `libWrapper Shim: '${target}' does not have a setter`;
				original = descriptor.set;
				descriptor.set = wrapper;
			}

			descriptor.configurable = true;
			Object.defineProperty(obj, fn_name, descriptor);
		}
	}
});


/**************************************** /libWrapper shim *********************************************/

Hooks.once("init", () => Journal.registerSheet ? null : _initializeJournalSheetShim());
