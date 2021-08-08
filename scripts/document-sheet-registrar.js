import { libWrapper } from './libWrapperShim.js'

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
export default class DocumentSheetRegistrar {
	/**
	 * The name of the Document Sheet Registrar module module
	 *
	 * @type {string} 
	 * @readonly
	 * @static
	 * @memberof DocumentSheetRegistrar
	 */
	static get name() { return "_document-sheet-registrar"; }

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
		return Object.entries(CONFIG)
			.filter(([key, config]) => config.sheetClass && config.collection)
			.map(([key, config]) => {
				/** @return {DocumentMap} */
				return {
					name: key,
					class: config.documentClass,
					collection: config.collection
				}
			});
	}


	/*********************************************************************************************/

	
	/**
	 * Handles the getDocumentSheetHeaderButtons hook
	 *
	 * Adds a sheet configuration button to the header of the document sheet
	 * for those sheets that have had this option added.
	 *
	 * @static
	 * @param {DocumentSheet} sheet   - A document sheet that is being rendered
	 * @param {object[]}      buttons - A list of button definitions for the header of the sheet
	 * @memberof DocumentSheetRegistrar
	 */
	static getDocumentSheetHeaderButtons(sheet, buttons) {
		// If the document name isn't in the set of documentTypes, do nothing
		if (!this.documentTypes.some(doc => doc.name == sheet.object.documentName)) return;

		// If the document doesn't have multiple registered sheets for this type, do nothing
		if (Object.entries(CONFIG[sheet.object.documentName]?.sheetClasses?.[sheet.object.type]).length < 2) return;

		// If there is already a Sheet button, do nothing
		if (buttons.includes(button => button.label == "Sheet")) return;

		// Add the sheet configuration button to the start of the header button row
		buttons.unshift({
			label: "Sheet",
			class: "configure-sheet",
			icon: "fas fa-cog",
			onclick: sheet._onConfigureSheet.bind(sheet)
		});
	}


	/**
	 * Initialize all of the document sheet registrars.
	 *
	 * @static
	 * @memberof DocumentSheetRegistrar
	 */
	static initializeDocumentSheets() {
		console.log(game.i18n.localize("_document-sheet-registrar.console.log.init"));

		for (let doc of this.documentTypes) {
			// Skip any collection that already has a sheet registration method
			if (doc.collection.registerSheet) continue;

			this.initializeDocumentSheet(doc);
		}

		// Add a sheet config event handler for header buttons on DocumentSheet
		DocumentSheet.prototype._onConfigureSheet = this._onConfigureSheet;

		// Add wrapper to update the default sheet config when settings are changed
		libWrapper.register("_document-sheet-registrar", "EntitySheetConfig.updateDefaultSheets", DocumentSheetRegistrar.updateDefaultSheets, "OVERRIDE");

		// Add wrapper to ensure that the object.data.type is always set as exptcted
		libWrapper.register("_document-sheet-registrar", "EntitySheetConfig.prototype.getData", function (wrapped, ...args) {
			this.object.data.type = this.object.type;
			return wrapped(...args);
		}, "WRAPPER");
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
		// Set up the type property for this document
		this.setupTypes(doc);

		// Override the sheet retrieval method for this document type
		libWrapper.register("_document-sheet-registrar", `${doc.name}.prototype._getSheetClass`, this._getSheetClass, "OVERRIDE");

		// Add sheet registration methods to the document collection
		this.addRegistrationMethods(doc);

		// Configure the sheetClasses object for this document type
		this.configureSheetClasses(doc);

		// Redirect sheetClass
		this.redirectSheetClass(doc);
	}

	
	/**
	 * Ensures that the document has a type property, either a static 
	 * "base" or a getter that returns the type.
	 *
	 * @static
	 * @param {DocumentMap} doc - The type of document to add a type property to
	 * @return {*} 
	 * @memberof DocumentSheetRegistrar
	 */
	static setupTypes(doc) {
		Object.defineProperty(doc.class.prototype, "type", {
			get: function() {
				// The type stored in the document data
				return  this.data?.flags?.[DocumentSheetRegistrar.name]?.type || this.data?.type || CONST.BASE_ENTITY_TYPE;
			}
		});
	}


	/**
	 * Creates a new sheetClasses config object for this kind of document.
	 *
	 * @param {DocumentMap} doc - The kind of document to add a config object for
	 * @memberof DocumentSheetRegistrar
	 */
	static configureSheetClasses(doc) {
		CONFIG[doc.name].sheetClasses = { };

		if (doc.class.metadata.types.length) {
			for (let type of doc.class.metadata.types) {
				this.configureSheetClassessByType(doc, type);
			}
		}

		// "base" for documents that only have one type
		this.configureSheetClassessByType(doc, CONST.BASE_ENTITY_TYPE);
	}



	/**
	 * Creates a new sheetClasses config object for this document and type.
	 *
	 * @static
	 * @param {DocumentMap} doc  - The kind of document to add a config object for
	 * @param {string}      type - The name of the "type" for this document
	 * @memberof DocumentSheetRegistrar
	 */
	static configureSheetClassessByType(doc, type) {
		CONFIG[doc.name].sheetClasses[type] = {                                
			[doc.name]: {                        // Register the default sheet
				id: doc.name,
				default: true,                   // As the default
				label: doc.name,
				cls: CONFIG[doc.name].sheetClass
			}
		}
	}


	/**
	 * Links the old sheetClass definition to the new 'base' default sheet definition
	 *
	 * big thanks to fvtt-lib-wrapper Rui Pinheiro for inspiring this
	 *
	 * @static
	 * @param {DocumentMap} doc - The type of document to modify
	 * @memberof DocumentSheetRegistrar
	 */
	static redirectSheetClass(doc) {
		Object.defineProperty(CONFIG[doc.name], "sheetClass", {
			get: function() { 
				return CONFIG[doc.name].sheetClasses[CONST.BASE_ENTITY_TYPE][doc.name].cls
			},
			set: function (value) { 
				CONFIG[doc.name].sheetClasses[CONST.BASE_ENTITY_TYPE][doc.name].cls = value
			},
			configurable: false
		});
	}


	/**
	 * Adds a register and unregister method to the document collection.
	 *
	 * @param {DocumentMap} doc
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
			const options = args[2];

			const types = options?.types || doc.class?.metadata?.types || [CONST.BASE_ENTITY_TYPE];

			for (let type of types) {
				if (!Object.keys(CONFIG[doc.name].sheetClasses).some(key => key == type)) {
					CONFIG[doc.name].sheetClasses[type] = {};
				}
			}

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


	/*********************************************************************************************/


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
		if (!classes.length) {
			ui.notifications.warn(
				game.i18n.format("_document-sheet-registrar.ui.warn.no-sheet-found", { sheet: override })
			);
			return null;
		}
		return (classes.find(s => s.default) ?? classes.pop()).cls;
	}

	/**
	 * Handle requests to configure the default sheet used by this Document
	 * @private
	 */
	static _onConfigureSheet(event) {
		event.preventDefault();
		new EntitySheetConfig(this.object, {
			top: this.position.top + 40,
			left: this.position.left + ((this.position.width - 400) / 2)
		}).render(true);
	}

	/**
	 * Update the currently default Sheets using a new core world setting
	 * @param {object} setting
	 */
	static updateDefaultSheets(setting = {}) {
		if (!Object.keys(setting).length) return;
		const documents = [
			"Actor", "Item", 
			...DocumentSheetRegistrar.documentTypes.map(doc => doc.name)
		];
		for (let documentName of documents) {
			const cfg = CONFIG[documentName];
			const classes = cfg.sheetClasses;
			const collection = cfg.collection.instance;
			let defaults = setting[documentName] || {};
			if (!defaults) continue;

			// Update default preference for registered sheets
			for (let [type, sheetId] of Object.entries(defaults)) {
				const sheets = Object.values(classes[type] || {});
				let requested = sheets.find(s => s.id === sheetId);
				if (requested) sheets.forEach(s => s.default = s.id === sheetId);
			}

			// Close and de-register any existing sheets
			for (let document of collection) {
				Object.values(document.apps).forEach(app => app.close());
				document.apps = {};
			}
		}
	}
}

// On init, create the nessesary configs and methods to enable the sheet config API
Hooks.once("init", DocumentSheetRegistrar.initializeDocumentSheets.bind(DocumentSheetRegistrar));

// When a doc sheet is rendered, add a header button for sheet configuration
Hooks.on("getDocumentSheetHeaderButtons", DocumentSheetRegistrar.getDocumentSheetHeaderButtons.bind(DocumentSheetRegistrar));