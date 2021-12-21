import { libWrapper } from './libWrapperShim.js'

/**
 * Creates a shim that allows for the registration of custom document sheets
 * using "made up" types to prevent the wrong sheet from being used with the 
 * wrong documents.
 *
 * Requires libWrapper (or libWrapper shim).
 */
export default class DocumentSheetRegistrar {
	/**
	 * The name of the Document Sheet Registrar module
	 *
	 * @type {string} 
	 * @readonly
	 * @static
	 * @memberof DocumentSheetRegistrar
	 */
	static get name() { return "_document-sheet-registrar"; }


	/*********************************************************************************************/

	/**
	 * Handles the init hook
	 *
	 * Initializes all the types, and registers a wrapper on registerSheet
	 *
	 * @static
	 * @memberof DocumentSheetRegistrar
	 */
	static init() {
		console.log(game.i18n.localize("Document Sheet Registrar: initializing..."));

		// Initialize all of the document sheet registrars
		for (let doc of Object.values(foundry.documents)) {
			this.setupTypes(doc);
		}

		libWrapper.register("_document-sheet-registrar", "DocumentSheetConfig.registerSheet", DocumentSheetRegistrar.registerSheet, "WRAPPER");

		console.log(game.i18n.localize("Document Sheet Registrar: ...ready!"));
	}

	
	/**
	 * Ensures that the document data has a type property, either a static 
	 * "base" or a getter that returns the type.
	 *
	 * @static
	 * @param {DocumentMap} doc - The type of document to add a type property to
	 * @return {*} 
	 * @memberof DocumentSheetRegistrar
	 */
	static setupTypes(doc) {
		if (doc.schema.schema.type) return;
		Object.defineProperty(doc.schema.prototype, "type", {
			get: function () {
				// The type stored in the document data
				return this.flags?.[DocumentSheetRegistrar.name]?.type || CONST.BASE_DOCUMENT_TYPE;
			}
		});
	}

	/**
	 * Register a sheet class as a candidate which can be used to display documents of a given type
	 *
	 * @wrapper `DocumentSheetConfig.registerSheet`
	 *
	 * @param {Function} wrapped                 The original function which has been wrapped
	 * @param {Function} documentClass           The Document class for which to register a new Sheet option
	 * @param {string} scope                     Provide a unique namespace scope for this sheet
	 * @param {Application} sheetClass           A defined Application class used to render the sheet
	 * @param {Object} options                   Additional options used for sheet registration
	 * @param {string|function} [options.label]  A human readable label for the sheet name, which will be localized
	 * @param {string[]} [options.types]         An array of document types for which this sheet should be used
	 * @param {boolean} [options.makeDefault]    Whether to make this sheet the default for provided types
	 *
	 * @example
	 * DocumentSheetConfig.registerSheet?.(DocumentClass, "myModule", SheetApplicationClass, {
	 *     types: ["base"],
	 *     makeDefault: false,
	 *     label: "My Document sheet"
	 * });
	 */
	static registerSheet(wrapped, ...args) {
		const classRef = args[0];
		const options = args[3];

		const types = options?.types || classRef.metadata?.types || [CONST.BASE_DOCUMENT_TYPE];

		for (let type of types) {
			if (!Object.keys(CONFIG[classRef.documentName].sheetClasses).some(key => key == type)) {
				CONFIG[classRef.documentName].sheetClasses[type] = {};
			}
		}

		wrapped(...args);
	}
}


// On init, create the nessesary configs and methods to enable the sheet config API
Hooks.once("init", DocumentSheetRegistrar.init.bind(DocumentSheetRegistrar));

// Call the init hook to alert modules that the registrar is ready
Hooks.once("ready", () => Hooks.callAll("documentSheetRegistrarInit"));