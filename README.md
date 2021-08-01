# Lib: Document Sheet Registrar

![extendedJournalSheets](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2FLeague-of-Foundry-Developers%2Fleague-repo-status%2Fshields-endpoint%2F_extended-journal-sheets.json)

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
- ~~Folder~~ (excluded for complexity)

### `DocType.registerSheet`

Register a sheet class as a candidate which can be used to display Journal Entries.

#### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| scope | `string`  | Provide a unique namespace scope for this sheet | &nbsp; |
| sheetClass | `Application`  | A defined Application class used to render the sheet | &nbsp; |
| options | `Object`  | Additional options used for sheet registration | &nbsp; |
| options.label | `string`  | A human readable label for the sheet name, which will be localized | *Optional* |
| options.types | `Array.<string>`  | An array of entity types for which this sheet should be used | *Optional* |
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
