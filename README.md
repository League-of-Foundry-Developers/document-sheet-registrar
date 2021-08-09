# Lib: Document Sheet Registrar

![_document-sheet-registrar](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2FLeague-of-Foundry-Developers%2Fleague-repo-status%2Fshields-endpoint%2F_document-sheet-registrar.json)
![Latest Release Download Count](https://img.shields.io/github/downloads/League-of-Foundry-Developers/document-sheet-registrar/latest/_document-sheet-registrar.zip) 

## Why does this exist?

- Replacing the Journal Sheet is difficult to do in a way which is compatible with both Foundry Core and other modules/systems which replace Journal Sheets.
- Styling a particular journal entry (or kind of entry, e.g. from a particular module) is difficult to do in a way which does not conflict with other modules.
- Modules which alter the display of Journal Entries would like a predictable way to do so, which is hard when different modules use different approaches to work around the issues above.

[This issue](https://gitlab.com/foundrynet/foundryvtt/-/issues/4994) outlines a generic request that if implemented would allow Journal (and other document) "sheets" to be registered just like Actor sheets.


## Objective
Our goal with this library is to offer a way to leverage this missing API as Foundry Gaming considers implementing this solution in Core.

You should consider using this module if you replace or drastically modify one of the compatible Document Sheets in a module and want your module to be compatible with other modules and systems which do the same.

Note that systems are encouraged to override the base sheet in CONFIG and should not need to use this library.

## API
Once this library is active (it should be activated at the start of the `init` hook), it enables the same API that Actor and Item documents use to register and unregister sheets for any Document Type in `CONFIG` which has both a `sheetClass` and a `collection`:

- ~~Actor~~ (core)
- ~~Item~~ (core)
- JournalEntry
- RollTable
- Macro
- Playlist
- Scene
- User
- Folder

### Hooks

This library provides two hooks:
```js
Hooks.on("preDocumentSheetRegistrarInit", (settings) => {});
Hooks.on("documentSheetRegistrarInit", (documentTypes) => {});
```

The `preDocumentSheetRegistrarInit` hook passes an object of boolean "settings", you must set the setting coresponding to the document type that you wish to register a sheet for to `true`. If you do not do this, the registration method will not be created which will produce an error when you call it.

The `documentSheetRegistrarInit` hook indicates that the initialization process has been completed, and it is now safe to register your sheets. This hook also passes an object of data about any documents for which this library has been enabled. 

### `DocType.registerSheet`

Register a sheet class as a candidate which can be used to display this document. 

You must enable your chosen document type in the `preDocumentSheetRegistrarInit` hook for this method to be available.

#### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| scope | `string`  | Provide a unique namespace scope for this sheet | &nbsp; |
| sheetClass | `Application`  | A defined Application class used to render the sheet | &nbsp; |
| options | `Object`  | Additional options used for sheet registration | &nbsp; |
| options.label | `string`  | A human readable label for the sheet name, which will be localized | *Optional* |
| options.types | `Array.<string>`  | An array of entity types for which this sheet should be used.  When not specified, all types will be used. That does *not* include artificial types, if you are using artificial types you must specify them here. | *Optional* |
| options.makeDefault | `boolean`  | Whether to make this sheet the default for provided types | *Optional* |

#### Examples

```javascript
Journal.registerSheet?.("myModule", SheetApplicationClass, {
  types: ["base"],
  makeDefault: false,
  label: "My Journal Entry sheet"
});
```

### `DocType.unregisterSheet`

Unregister a Journal Entry sheet class, removing it from the list of available Applications to use for Journal Entries.

You must enable your chosen document type in the `preDocumentSheetRegistrarInit` hook for this method to be available.

#### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| scope | `string`  | Provide a unique namespace scope for this sheet | &nbsp; |
| sheetClass | `Application`  | A defined Application class used to render the sheet | &nbsp; |
| options | `Object`  | Additional options used for sheet registration | *Optional* |
| options.types | `Array.<string>`  | An Array of types for which this sheet should be removed | *Optional* |

#### Examples

```javascript
Journal.unregisterSheet?.("myModule", SheetApplicationClass, {
	types: ["base"],
});
```


### Setting which sheet your Document opens with.

The core flag `sheetClass` on the document will establish which registered sheet to use when opening.

It can be set in [any of the ways a flag can be set](https://foundryvtt.wiki/en/development/guides/handling-data#flags).
```js
someJournalEntry.setFlag('core', 'sheetClass', 'my-module.MyModuleSheetClassName');
```
### Types

This library introduces the ability to give documents "types" even for documents that did not support types before. The `object.type` property is supported on many documents in Core such as Actor (character, npc, vehicle), Item, Macro (script, chat), and others. This allows a document to have type-specific sheets such as NPC sheets vs. character sheets. With Document Sheet Registrar, we can add "artificial" types to any of the following nine do documents:

- Actor
- Item
- JournalEntry
- RollTable
- Macro
- Playlist
- Scene
- User
- Folder

There are two steps to adding a new artificial type. First, you must register a new sheet and pass your custom type as part of the `types` array:

```javascript
DocType.registerSheet?.("myModule", SheetApplicationClass, {
  types: ["my-type"],
  makeDefault: false,
  label: "My document sheet"
});
```

When you register a sheet in this way, the sheet will only be avaialble to documents with the specified type. Since the `object.data.type` property is part of the official schema of the document, we can not add this property to docuemnts that don't already support it, or give it a custom value. Instead, DSR uses a `type ` flag in the `_document-sheet-registrar` scope to specifiy the artificial type.

```js
document.setFlag("_document-sheet-registrar", "type", "my-type")
```

This will cause the `object.type` getter on the document to return the value stored in this flag, resulting in a different selection of sheets which are specific to that `type`.

Note that if no sheet is registered to handle a given document and type, an error will occur. When this happens with the library enabled, a UI wanring is displayed. When the library is disabled, the default sheet for that document will render.

## The Sheet Config Dialog

In order to give the user control of how their documents are rendered, documents that have multiple registered sheets will now have a "⚙ sheet" button in the header of their sheet application. This button opens the same sheet dialog that is used by Actor and Item.

If for some reason you need to prevent users from modifying this, you can hide the button with CSS by targetting the `.configure-sheet` class on the element.

If it is important that documents created for your module only be rendered using sheets provided by your module, you may also want to restrict which sheets are avaialble by setting a particular `type` for those sheets. You can specify an existing type for documents that support it, e.g. "script" Macros, or you can use the artificial types system discussed in the API section above. The sheet config dialog will only give the user the option to select a sheet that is valid for the type of the document being configured.