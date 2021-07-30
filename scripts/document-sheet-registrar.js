/**
 * Creates a shim that allows for the registration of custom document sheets.
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
class DocumentSheetRegistrar {
	/**
	 * @typedef {object} DocumentMap A map of document name, class, and collection
	 * @property {string}              name       - The name of the document
	 * @property {ClientDocumentMixin} class      - The class of the document
	 * @property {WorldCollection}     collection - The collection of the document
	 *//**
	 * A mapping of document types and the classes that handle them.
	 * @type {DocumentMap[]}
	 */
	static get documentTypes() {
		return [
			{ "name": "JournalEntry", "class": JournalEntry, "collection": Journal },
			{ "name": "Macro",        "class": Macro,        "collection": Macros },
			{ "name": "Scene",        "class": Scene,        "collection": Scenes },
		]
	}

	
	/**
	 * Initialize all of the document sheet registrars.
	 *
	 * @static
	 * @memberof DocumentSheetRegistrar
	 */
	static initializeDocumentSheets() {
		for (let doc of this.documentTypes) {
			// Skip any collection that already has a sheet registration method
			if (doc.collection.registerSheet) continue;
			
			this.initializeDocumentSheet(doc);
		}
	}

	
	/**
	 * Set up the nessesary configuration objects and methods for 
	 * sheet registration of this document type.
	 *
	 * @static
	 * @param {DocumentMap} doc - The type of document to add sheet registration to
	 * @memberof DocumentSheetRegistrar
	 */
	static initializeDocumentSheet(doc) {
		// Set the base type for this document class
		doc.class.prototype.type = "base";

		// Override the sheet retrieval method for this document type
		libWrapper.register("_document-sheet-registrar", `${doc.name}.prototype._getSheetClass`, this._getSheetClass, "OVERRIDE");

		// Add sheet registration methods to the document collection
		this.addRegistrationMethods(doc);

		// Configure the sheetClasses object for this document type
		this.configureSheetClasses(doc);
	}

	
	/**
	 * Creates a new sheetClasses config object for this document type.
	 *
	 * @param {*} doc - The type of document to add a config object for
	 * @memberof DocumentSheetRegistrar
	 */
	static configureSheetClasses(doc) {
		CONFIG[doc.name].sheetClasses = {
			"base": {                                // "base" because these documents only have one type
				[doc.name]: {                        // Register the default sheet
					id: doc.name,
					default: true,                   // As the default
					label: doc.name,
					cls: CONFIG[doc.name].sheetClass
				}
			}
		}
	}
	
	/**
	 * Adds a register and unregister method to the document collection.
	 *
	 * @param {*} doc
	 * @memberof DocumentSheetRegistrar
	 */
	static addRegistrationMethods(doc) {
		/**
		* Register a sheet class as a candidate which can be used to display this document.
		*
		* @param {string}      scope                  Provide a unique namespace scope for this sheet
		* @param {Application} sheetClass             A defined Application class used to render the sheet
		* @param {Object}      options                Additional options used for sheet registration
		* @param {string}     [options.label]         A human readable label for the sheet name, which will be localized
		* @param {string[]}   [options.types]         An array of entity types for which this sheet should be used
		* @param {boolean}    [options.makeDefault]   Whether to make this sheet the default for provided types
		*
		* @example
		* Document.registerSheet?.("myModule", SheetApplicationClass, {
		*     types: ["base"],
		*     makeDefault: false,
		*     label: "My Document sheet"
		* });
		*/
		doc.collection.registerSheet = function (...args) {
			EntitySheetConfig.registerSheet(doc.class, ...args);
		}

		/**
		* Unregister a sheet class, removing it from the list of available Applications to use for this document.
		*
		* @param {string} scope              Provide a unique namespace scope for this sheet
		* @param {Application} sheetClass    A defined Application class used to render the sheet
		* @param {Object} [options]          Additional options used for sheet registration
		* @param {string[]} [options.types]  An Array of types for which this sheet should be removed
		*
		* @example
		* Document.unregisterSheet?.("myModule", SheetApplicationClass, {
		* 	types: ["base"],
		* });
		*/
		doc.collection.unregisterSheet = function (...args) {
			EntitySheetConfig.unregisterSheet(doc.class, ...args)
		}
	}

	
	/**
	 * Retrieve the sheet class for the document. @see Actor._getSheetClass
	 *
	 * @static
	 * @return {*} 
	 * @memberof DocumentSheetRegistrar
	 */
	static _getSheetClass() {
		const cfg = CONFIG[this.documentName];
		const sheets = cfg.sheetClasses[this.type] || {};
		const override = this.getFlag("core", "sheetClass");
		if (sheets[override]) return sheets[override].cls;
		const classes = Object.values(sheets);
		if (!classes.length) return null;
		return (classes.find(s => s.default) ?? classes.pop()).cls;
	}
}

Hooks.once("init", DocumentSheetRegistrar.initializeDocumentSheets.bind(DocumentSheetRegistrar));
