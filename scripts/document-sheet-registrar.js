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

	libWrapper.register("_document-sheet-registrar", "JournalEntry.prototype._getSheetClass", _getSheetClass, "OVERRIDE");

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


Hooks.once("init", () => Journal.registerSheet ? null : _initializeJournalSheetShim());
