# Current contract version policy

AVE is in development and retains one current version for each contract
family. Replacing a version means deleting its old Schema, examples, generated
bindings, adapters, tests and current documentation in the same change.

Runtime boundaries reject every non-current identity before authoritative
writes. There is no migration, conversion, dual read, alias or compatibility
mode for AVE-owned contract versions. The contract identity gate verifies only
that each retained current Schema has an exact filename, `$id`, title and
declared version, then roundtrips its current generated bindings.
