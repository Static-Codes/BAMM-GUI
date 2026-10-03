let commands = getData();

let commandSelect = document.getElementById("command-select");
let argsContainer = document.getElementById("command-arguments-container");
let descriptionElement = document.getElementById("command-description");
let executeButton = document.getElementById("execute-command-btn");

let commandList = document.querySelector("#command-list");

let duplicateCommandButton = document.querySelector(
  ".action-button.duplicate-command-btn",
);
let removeCommandButton = document.querySelector(
  ".action-button.remove-command-btn",
);
let validateScriptButton = document.querySelector(
  ".action-button.validate-script-btn",
);

let nextIndexAfterDelete = 0;
let scriptIsValidated = false;
let jsMode = false;
let featuresAllowed = false;
let visitAdded = false;
let browserExists = false;

// List of all proxy-related feature commands
const proxyFeatures = [
  "use-http-proxy",
  "use-https-proxy",
  "use-socks4-proxy",
  "use-socks5-proxy",
];

function addCommandToCommandList(commandText, addToLocalStorage = true) {
  try {
    let childNode = document.createElement("li");

    document.querySelectorAll("#command-list li.list-item").forEach((item) => {
      item.classList.remove("list-item");
    });

    childNode.classList.add("list-item");
    childNode.textContent = commandText;

    commandList.appendChild(childNode);

    if (addToLocalStorage) {
      reindexCommands();
    }

    console.log(`Added element at index ${commandList.children.length - 1}`);
    refocusSelection();
  } catch (e) {
    console.error(e);
  }
}

function clearCurrentScriptState(commandsAdded) {
  setData({});
  localStorage.clear();
  window.location.reload(true);
  if (commandsAdded.length > 0) {
    for (let i = commandsAdded.length - 1; i >= 0; i--) {
      commandsAdded[i].remove();
    }
  }
}

function convertUTF8toBase64(str) {
  const utf8Bytes = new TextEncoder().encode(str);
  const binaryStr = utf8Bytes.reduce((acc, byte) => {
    return acc + String.fromCharCode(byte);
  }, "");
  return btoa(binaryStr);
}

function duplicateSelectedCommand() {
  let selectedChild = document.querySelector(".list-item");
  if (!selectedChild) {
    createAlert("warning", "Please select an element to duplicate.");
    throw new Error("No element selected");
  }

  let commandText = selectedChild.textContent;

  if (commandText.includes('"browser":')) {
    createAlert(
      "warning",
      "Unable to duplicate the browser command, only one of these commands may be present in any given script.",
    );
    return;
  }

  addCommandToCommandList(commandText, true);

  console.log(`Duplicated command and appended to end.`);
}

function getData() {
  try {
    let commandsFromLS = localStorage.getItem("commands");
    let commandsAdded = document.querySelectorAll("#command-list li");

    if (
      commandsFromLS == null ||
      commandsFromLS === "{}" ||
      commandsFromLS === "[]"
    ) {
      if (commandsAdded.length > 0) {
        clearCurrentScriptState(commandsAdded);
      }
      return {};
    }

    let data = JSON.parse(commandsFromLS);
    return Array.isArray(data) ? {} : data;
  } catch (e) {
    console.error(e);
    clearCurrentScriptState([]);
    return {};
  }
}

function getIndexOfSelectedCommand() {
  try {
    if (Object.keys(commands).length === 0) {
      createAlert("error", "No commands present in the current script.");
      throw new Error("No commands present in the current script.");
    }
    let child = document.querySelector(".list-item");
    if (!child) return -1;
    let parent = child.parentNode;
    return Array.prototype.indexOf.call(parent.children, child);
  } catch (e) {
    console.error(e);
    return -1;
  }
}

function handleCommandListClick(e) {
  const clickedItem = e.target.closest("li");

  if (clickedItem) {
    commandList.querySelectorAll(".list-item").forEach((item) => {
      item.classList.remove("list-item");
    });
    clickedItem.classList.add("list-item");
  }
}

function loadCurrentScriptCommands() {
  let currentlySelectedItem = null;
  const commandItems = document.querySelectorAll("#command-list li");

  function handleSelection(event) {
    const newSelectedItem = event.currentTarget;

    if (currentlySelectedItem !== null) {
      currentlySelectedItem.classList.remove("list-item");
    }
    newSelectedItem.classList.add("list-item");
    currentlySelectedItem = newSelectedItem;
  }

  if (typeof usingOtter !== "undefined" && usingOtter) {
    for (let cmd of commandItems) {
      cmd.addEventListener("click", handleSelection);
    }
  } else {
    commandItems.forEach((item) => {
      item.addEventListener("click", handleSelection);
    });
  }
}

function recalculateState() {
  const scriptCommands = Object.values(commands);

  browserExists = scriptCommands.some((cmd) => cmd.includes('"browser":'));
  visitAdded = scriptCommands.some((cmd) => cmd.includes('"visit":'));

  // Features are a prefix of the script, so they are only offered up front,
  // before a browser or visit command has been added.
  featuresAllowed = !browserExists && !visitAdded;
}

function isCommandDisabled(command) {
  const commandName = command.commandName;

  if (commandName === "Browser") {
    return browserExists;
  }

  if (commandName === "Visit") {
    return !browserExists || visitAdded;
  }

  if (commandName.includes("Feature:")) {
    return !featuresAllowed;
  }

  // The action commands only unlock once the script has both a browser and a
  // visit command.
  return !browserExists || !visitAdded;
}

function populateCommandSelect() {
  commandSelect.innerHTML = "";

  recalculateState();

  let selectedCommandName = commandSelect.value;
  let hasSetInitialSelection = false;

  commandCollection.forEach((command) => {
    let option = document.createElement("option");
    option.value = command.commandName;
    option.textContent = command.commandName;
    option.disabled = isCommandDisabled(command);

    if (!option.disabled && !hasSetInitialSelection) {
      selectedCommandName = command.commandName;
      hasSetInitialSelection = true;
    }

    commandSelect.appendChild(option);
  });

  const finalSelection = commandSelect.querySelector(
    `option[value="${selectedCommandName}"]`,
  );

  if (finalSelection && !finalSelection.disabled) {
    commandSelect.value = selectedCommandName;
  } else {
    const firstAvailable = commandSelect.querySelector(
      "option:not([disabled])",
    );
    if (firstAvailable) {
      commandSelect.value = firstAvailable.value;
    }
  }

  const finalSelectedCommand = commandCollection.find(
    (cmd) => cmd.commandName === commandSelect.value,
  );
  if (finalSelectedCommand) {
    renderArguments(finalSelectedCommand);
  }
}

function refocusSelection() {
  commandList.removeEventListener("click", handleCommandListClick);
  commandList.addEventListener("click", handleCommandListClick);
}

function reindexCommands() {
  let newCommands = {};
  let listItems = commandList.children;

  for (let i = 0; i < listItems.length; i++) {
    newCommands[i] = listItems[i].textContent;
  }

  commands = newCommands;
  setData(commands);
  recalculateState();
  populateCommandSelect();
  console.log(getData());
}

function isJsBlockCommandText(commandText) {
  return (
    commandText.includes("start-javascript") ||
    commandText.includes("add-to-js") ||
    commandText.includes("end-javascript")
  );
}

function selectCommandAtIndex(index) {
  const child = commandList.children[index];
  if (child) {
    child.classList.add("list-item");
  }
}

function getJsBlockStartIndex(removedCommandText, index) {
  let startIndex = index;
  if (removedCommandText.includes("add-to-js")) {
    startIndex = index - 1;
  } else if (removedCommandText.includes("end-javascript")) {
    startIndex = index - 2;
  }

  return startIndex < 0 ? 0 : startIndex;
}

function collectJsBlockIndices(startIndex) {
  const indicesToRemove = [];
  if (
    commands[startIndex] &&
    commands[startIndex].includes("start-javascript")
  )
    indicesToRemove.push(startIndex);
  if (
    commands[startIndex + 1] &&
    commands[startIndex + 1].includes("add-to-js")
  )
    indicesToRemove.push(startIndex + 1);
  if (
    commands[startIndex + 2] &&
    commands[startIndex + 2].includes("end-javascript")
  )
    indicesToRemove.push(startIndex + 2);

  return indicesToRemove;
}

function removeJsBlockCommand(removedCommandText, index) {
  const startIndex = getJsBlockStartIndex(removedCommandText, index);

  collectJsBlockIndices(startIndex)
    .sort((a, b) => b - a)
    .forEach((idx) => {
      if (commandList.children[idx]) {
        commandList.children[idx].remove();
      }
    });

  jsMode = false;

  reindexCommands();
  nextIndexAfterDelete = startIndex > 0 ? startIndex - 1 : 0;
  selectCommandAtIndex(nextIndexAfterDelete);
}

function getNextIndexAfterDelete(index, cmdCount) {
  if (cmdCount === 1) {
    return -1;
  }
  if (index === cmdCount - 1) {
    return index - 1;
  }
  return index;
}

function removeSelectedCommand() {
  let selectedChild = document.querySelector(".list-item");
  if (!selectedChild) {
    createAlert("error", "Please select an element to remove.");
    throw new Error("No element selected");
  }

  let index = getIndexOfSelectedCommand();
  let removedCommandText = commands[index];

  if (removedCommandText.includes('"browser":')) {
    createAlert(
      "error",
      "Unable to remove the browser command, this is a requirement for every script.",
    );
    return;
  }

  if (isJsBlockCommandText(removedCommandText)) {
    removeJsBlockCommand(removedCommandText, index);
    return;
  }

  nextIndexAfterDelete = getNextIndexAfterDelete(
    index,
    Object.keys(commands).length,
  );

  try {
    selectedChild.remove();
    console.log(`deleted command element at index ${index}`);

    reindexCommands();

    if (Object.keys(commands).length === 0) {
      console.log("Command list is now empty.");
      return;
    }

    selectCommandAtIndex(nextIndexAfterDelete);
  } catch (e) {
    console.error(e);
  }
}

function shouldSkipArgument(command, argOptions) {
  return (
    Array.isArray(argOptions) && argOptions.length === 0 && !command.isCodeBlock
  );
}

function getPlaceholder(command, argName) {
  return command.placeholder != null
    ? command.placeholder
    : `Enter value for ${argName}`;
}

function buildArgOptionElement(command, argName, optionValue, index) {
  const optionWrapper = document.createElement("label");
  optionWrapper.classList.add("arg-option");

  const radioInput = document.createElement("input");
  radioInput.type = "radio";
  radioInput.name = argName;
  radioInput.value = optionValue;
  radioInput.id = `${command.commandName}-${argName}-${optionValue}`;
  if (index === 0) {
    radioInput.checked = true;
  }

  const customRadio = document.createElement("span");
  customRadio.classList.add("radio-custom");

  const optionText = document.createElement("span");
  optionText.textContent = optionValue;

  optionWrapper.appendChild(radioInput);
  optionWrapper.appendChild(customRadio);
  optionWrapper.appendChild(optionText);

  return optionWrapper;
}

function renderArgOptions(command, argName, argOptions) {
  const optionsContainer = document.createElement("div");
  optionsContainer.classList.add("arg-options-container");

  argOptions.forEach((optionValue, index) => {
    optionsContainer.appendChild(
      buildArgOptionElement(command, argName, optionValue, index),
    );
  });

  return optionsContainer;
}

function renderArgTextInput(command, argName) {
  if (command.isCodeBlock) {
    const textAreaInput = document.createElement("textarea");
    textAreaInput.classList.add("arg-text-input", "code-block-input");
    textAreaInput.name = argName;
    textAreaInput.placeholder = getPlaceholder(command, argName);
    return textAreaInput;
  }

  const textInput = document.createElement("input");
  textInput.type = "text";
  textInput.classList.add("arg-text-input");
  textInput.name = argName;
  textInput.placeholder = getPlaceholder(command, argName);
  return textInput;
}

function buildArgGroup(command, argName, argOptions) {
  const argGroup = document.createElement("div");
  argGroup.classList.add("arg-group");

  const label = document.createElement("label");
  label.classList.add("arg-label");
  label.textContent = argName + ":";
  argGroup.appendChild(label);

  if (argOptions && argOptions.length > 0) {
    argGroup.appendChild(renderArgOptions(command, argName, argOptions));
  } else {
    argGroup.appendChild(renderArgTextInput(command, argName));
  }

  return argGroup;
}

function renderArguments(command) {
  argsContainer.innerHTML = "";
  descriptionElement.innerHTML = `<p>${command.commandDescription}</p>`;
  descriptionElement.hidden = false;

  Object.keys(command.commandArgs).forEach((argName) => {
    const argOptions = command.commandArgs[argName];

    if (shouldSkipArgument(command, argOptions)) {
      return;
    }

    argsContainer.appendChild(buildArgGroup(command, argName, argOptions));
  });
}

function safeB64Encode(str) {
  let utf8Bytes = new TextEncoder().encode(str);
  let binaryString = "";
  let len = utf8Bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binaryString += String.fromCharCode(utf8Bytes[i]);
  }
  return btoa(binaryString);
}

function setData(data) {
  localStorage.removeItem("commands");
  localStorage.setItem("commands", JSON.stringify(data));
}

function isQuotedString(value) {
  return value.startsWith('"') && value.endsWith('"') && value.length > 1;
}

function validateSecondsArgument(argKey, argValue) {
  const numericValue = parseFloat(argValue);
  if (isNaN(numericValue) || !isFinite(numericValue)) {
    createAlert(
      "error",
      `The value for '${argKey}' in 'Wait-For-Seconds' must be a valid number (i.e, 2 or 0.5) and must not be quoted.`,
    );
    return false;
  }
  return true;
}

function validateHeadersArgument(argValue) {
  if (!isQuotedString(argValue)) {
    createAlert(
      "error",
      `The value for 'headers' in 'Add-Headers' must be a single quoted JSON string (i.e., '"{\\"Header\\": \\"Value\\"}"').`,
    );
    return false;
  }

  try {
    JSON.parse(argValue.slice(1, -1));
  } catch (e) {
    createAlert(
      "error",
      `The content inside the quotes for 'headers' in 'Add-Headers' must be valid JSON.`,
    );
    return false;
  }

  return true;
}

function validateQuotedArgument(argKey, selectedCommandName, argValue) {
  if (!isQuotedString(argValue)) {
    createAlert(
      "error",
      `The value for '${argKey}' in '${selectedCommandName}' must be a quoted string (i.e., '"value"').`,
    );
    return false;
  }
  return true;
}

function requiresQuotedArgument(selectedCommand) {
  const selectedCommandName = selectedCommand.commandName;
  return (
    (selectedCommand.placeholder &&
      selectedCommand.placeholder.startsWith('"')) ||
    selectedCommandName === "Add-Cookie" ||
    selectedCommandName === "Add-Header" ||
    selectedCommandName === "Click-At-Position" ||
    selectedCommandName === "Fill-Text" ||
    selectedCommandName === "Fill-Text-Exp" ||
    selectedCommandName === "Open-New-Tab" ||
    selectedCommandName === "Select-Option" ||
    selectedCommandName.startsWith("Feature: use-") || // Includes proxy features
    selectedCommandName.startsWith("Feature: add-") // Add-Extension
  );
}

function validateArgumentValue(selectedCommand, argKey, argValue) {
  const selectedCommandName = selectedCommand.commandName;

  if (selectedCommandName === "Wait-For-Seconds" && argKey === "seconds") {
    return validateSecondsArgument(argKey, argValue);
  }

  if (selectedCommandName === "Add-Headers" && argKey === "headers") {
    return validateHeadersArgument(argValue);
  }

  if (requiresQuotedArgument(selectedCommand)) {
    return validateQuotedArgument(argKey, selectedCommandName, argValue);
  }

  return true;
}

function validateArgument(selectedCommand, argKey, argValue) {
  if (selectedCommand.commandArgs[argKey] !== null) {
    return true;
  }

  return validateArgumentValue(selectedCommand, argKey, argValue);
}

function validateArguments(selectedCommandName, commandArgs) {
  const selectedCommand = commandCollection.find(
    (cmd) => cmd.commandName === selectedCommandName,
  );

  if (!selectedCommand) {
    createAlert("error", "Command definition not found.");
    return false;
  }

  return Object.entries(commandArgs).every(([argKey, argValue]) =>
    validateArgument(selectedCommand, argKey, argValue),
  );
}

function validateScriptContents() {
  // Checks if string starts and ends with a double quote
  function safeQuote(value) {
    const str = String(value);
    if (str.startsWith('"') && str.endsWith('"')) {
      return str;
    }
    return `"${str}"`;
  }

  let commandEntries = Object.values(commands);
  if (commandEntries === "undefined" || commandEntries.length === 0) {
    createAlert(
      "error",
      "Please add commands before trying to validate a script's contents.",
    );
    throw new Error(
      "Please add commands before trying to validate a script's contents.",
    );
  }

  let scriptLines = [];
  try {
    for (const rawEntry of commandEntries) {
      const parsedObj = JSON.parse(rawEntry);
      const keys = Object.keys(parsedObj);

      if (keys.length === 0) {
        continue;
      }

      const commandName = keys[0];
      const commandData = parsedObj[commandName];

      let argsString = "";

      if (typeof commandData === "object" && commandData !== null) {
        // If a nested object is present, safeQuoting is attempted for every object value.
        argsString = Object.values(commandData).map(safeQuote).join(" ");
      } else {
        // If a single string is present, safe quoting is attempted on just the single string.
        argsString = safeQuote(commandData);
      }

      scriptLines.push(`${commandName} ${argsString}`);
    }
  } catch (e) {
    createAlert("error", `Error processing script commands: ${e.message}`);
    console.error("Script Command Processing Error:", e);
    return;
  }

  const rawContents = scriptLines.join("\n");

  let b64Contents;
  try {
    b64Contents = safeB64Encode(rawContents);
  } catch (e) {
    createAlert("error", "Failed to Base64 encode script contents.");
    console.error("Base64 Encoding Error:", e);
    return;
  }

  const finalUrl = `${validateScriptURL}?contents=${b64Contents}`;

  fetch(finalUrl, {
    method: "GET",
    signal: AbortSignal.timeout(5000),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          `Invalid HTTP status: ${response.status} ${response.statusText}`,
        );
      }
      return response.json();
    })
    .then((data) => {
      if (data.success) {
        createAlert("info", "Script validation successful.");
        console.log("Validation details:", data);
      } else {
        createAlert(
          "error",
          `Script validation failed, ${data.error || "No details provided."}`,
        );
        console.error("Validation failed response:", data);
      }
    })
    .catch((error) => {
      const errorMessage =
        error.message || "A network or connection error occurred.";
      createAlert(
        "error",
        `Validation request failed.<br/>Error: ${errorMessage}`,
      );
      console.error("Validation Fetch Error:", error);
    });
}

window.addEventListener("load", (e) => {
  Object.values(commands).forEach((commandText) => {
    addCommandToCommandList(commandText, false);
  });

  reindexCommands();
});

commandSelect.addEventListener("change", (event) => {
  let selectedCommandName = event.target.value;
  let selectedCommand = commandCollection.find(
    (cmd) => cmd.commandName === selectedCommandName,
  );

  if (selectedCommand) {
    renderArguments(selectedCommand);
  } else {
    argsContainer.innerHTML = "";
    descriptionElement.textContent = "";
    descriptionElement.hidden = true;
  }
});

function collectArgumentValues() {
  const commandArguments = {};

  argsContainer.querySelectorAll(".arg-group").forEach((group) => {
    const argLabel = group.querySelector(".arg-label").textContent.slice(0, -1);
    const key = argLabel.toLowerCase().replace(" ", "-");

    const textInput = group.querySelector(".arg-text-input");
    if (textInput) {
      commandArguments[key] = textInput.value;
    }
  });

  document
    .querySelectorAll('.arg-option input[type="radio"]:checked')
    .forEach((arg) => {
      commandArguments[arg.name] = arg.value;
    });

  return commandArguments;
}

function getFeatureName(commandName) {
  return commandName.toLowerCase().replace("feature: ", "");
}

// buildFeatureCommandText quotes the feature name before serialising it, so the stored
// value carries a layer of quotes the rest of this file never sees. Unwrap on read rather
// than on write: Parser.IsValidFileContents consumes the quoted form, so the wire format
// has to stay as it is.
function getStoredFeatureName(commandObject) {
  const storedName = commandObject.feature;

  if (typeof storedName !== "string") {
    return storedName;
  }

  if (storedName.startsWith('"') && storedName.endsWith('"')) {
    return storedName.slice(1, -1);
  }

  return storedName;
}

function isDuplicateFeature(featureName) {
  return Object.values(commands).some((commandString) => {
    try {
      const commandObject = JSON.parse(commandString);
      return getStoredFeatureName(commandObject) === featureName;
    } catch (e) {
      return false;
    }
  });
}

function isOtherProxyFeaturePresent(selectedFeatureName) {
  return Object.values(commands).some((commandString) => {
    try {
      const commandObject = JSON.parse(commandString);
      const storedFeatureName = getStoredFeatureName(commandObject);

      return (
        storedFeatureName &&
        proxyFeatures.includes(storedFeatureName) &&
        storedFeatureName !== selectedFeatureName
      );
    } catch (e) {
      return false;
    }
  });
}

function validateFeatureCommand(selectedCommandName) {
  if (!selectedCommandName.startsWith("Feature:")) {
    return true;
  }

  const selectedFeatureName = getFeatureName(selectedCommandName);

  if (isDuplicateFeature(selectedFeatureName)) {
    createAlert(
      "error",
      `The feature command '${selectedCommandName}' can only be added once to the script.`,
    );
    return false;
  }

  if (
    proxyFeatures.includes(selectedFeatureName) &&
    isOtherProxyFeaturePresent(selectedFeatureName)
  ) {
    createAlert(
      "error",
      "Only one proxy feature (http, https, socks4, or socks5) is allowed in a single script.",
    );
    return false;
  }

  return true;
}

function isJsModeTransitionValid(selectedCommandName) {
  if (jsMode && selectedCommandName !== "Add-JS-Code") {
    createAlert(
      "error",
      "You are inside a JavaScript block. The next command must be 'Add-JS-Code'.",
    );
    return false;
  }

  if (!jsMode && selectedCommandName === "Add-JS-Code") {
    createAlert(
      "error",
      "You must start a JavaScript block with 'Start-Javascript' before adding code.",
    );
    return false;
  }

  return true;
}

function buildFeatureCommandText(selectedCommandName, commandArguments) {
  const featureName = getFeatureName(selectedCommandName);

  const payload = {
    feature: `"${featureName}"`,
  };

  // Adding all arguments to the payload to be serialized.
  if (Object.keys(commandArguments).length > 0) {
    Object.assign(payload, commandArguments);
  }

  // Serializing of the command string.
  return JSON.stringify(payload);
}

function buildStandardCommandText(selectedCommandName, commandArguments) {
  const argKeys = Object.keys(commandArguments);

  const formattedCommandName = selectedCommandName
    .toLowerCase()
    .replace(/: /g, "-");

  console.log(formattedCommandName);

  // Handles the Browser command, which stores its arguments directly.
  if (argKeys.length === 0 || selectedCommandName === "Browser") {
    return JSON.stringify(commandArguments);
  }

  const finalObject = {};

  if (argKeys.length === 1) {
    // Single argument where the key is the command, and the value is the direct arg value.
    finalObject[formattedCommandName] = commandArguments[argKeys[0]];
  } else {
    // Multiple arguments where the key is the command, and the value is the full arguments object.
    finalObject[formattedCommandName] = commandArguments;
  }

  const commandText = JSON.stringify(finalObject);
  console.log(commandText);
  return commandText;
}

function buildCommandText(selectedCommandName, commandArguments) {
  if (selectedCommandName === "Start-Javascript") {
    return '{"start-javascript": ""}';
  }

  if (selectedCommandName === "End-Javascript") {
    return '{"end-javascript": ""}';
  }

  if (selectedCommandName === "Add-JS-Code") {
    const b64Code = convertUTF8toBase64(commandArguments["javascript-code"]);
    return `{"add-to-js": "${b64Code}"}`;
  }

  if (selectedCommandName.startsWith("Feature:")) {
    return buildFeatureCommandText(selectedCommandName, commandArguments);
  }

  return buildStandardCommandText(selectedCommandName, commandArguments);
}

function advanceAfterAddingCommand(selectedCommandName) {
  if (selectedCommandName === "Start-Javascript") {
    jsMode = true;
    commandSelect.value = "Add-JS-Code";
    renderArguments(
      commandCollection.find((cmd) => cmd.commandName === "Add-JS-Code"),
    );
    return;
  }

  if (selectedCommandName === "Add-JS-Code") {
    jsMode = false;
    commandSelect.value = "End-Javascript";
    renderArguments(
      commandCollection.find((cmd) => cmd.commandName === "End-Javascript"),
    );
  }
}

executeButton.addEventListener("click", (e) => {
  const selectedCommandName = commandSelect.value;

  if (!selectedCommandName) {
    createAlert("error", "Please select a command first.");
    return;
  }

  if (!isJsModeTransitionValid(selectedCommandName)) {
    return;
  }

  const commandData = {
    arguments: collectArgumentValues(),
  };

  if (!validateArguments(selectedCommandName, commandData.arguments)) {
    return;
  }

  const selectedCommand = commandCollection.find(
    (cmd) => cmd.commandName === selectedCommandName,
  );
  if (!selectedCommand) {
    createAlert("error", "Error: Command definition not found.");
    return;
  }

  if (!validateFeatureCommand(selectedCommandName)) {
    return;
  }

  console.log("--- Adding Command ---");

  addCommandToCommandList(
    buildCommandText(selectedCommandName, commandData.arguments),
    true,
  );

  advanceAfterAddingCommand(selectedCommandName);
});

duplicateCommandButton.addEventListener("click", (e) => {
  duplicateSelectedCommand();
});

removeCommandButton.addEventListener("click", (e) => {
  removeSelectedCommand();
});

validateScriptButton.addEventListener("click", (e) => {
  validateScriptContents();
});

loadCurrentScriptCommands();
