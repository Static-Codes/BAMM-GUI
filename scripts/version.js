// The GUI's own version.
//
// This is deliberately separate from the BAMM version.
// BAMM's HttpListener reports its own version on the /version endpoint, but the GUI ships from this repository.
// The two releases will have differing release versions, this is expected.
//
// This version must be bumped on every GUI release, and keep it in step with the release tag.

const GUI_VERSION = "1.1.0.0";
