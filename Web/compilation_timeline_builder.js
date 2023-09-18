

// Function to calculate the shortest and longest durations
function calculateDurations(entries) {
    let shortestDuration = Number.MAX_VALUE;
    let longestDuration = 0;

    entries.forEach(entry => {
        const duration = entry.DurationInSeconds;

        if (duration < shortestDuration) {
            shortestDuration = duration;
        }

        if (duration > longestDuration) {
            longestDuration = duration;
        }
    });

    return { shortestDuration, longestDuration };
}

// Function to set the color of a span based on duration
function setStyleBasedOnDuration(span, shortest, longest, duration) {
    // Calculate thresholds for dividing into thirds as percentages
    const third = (longest - shortest) / 3;

    if (duration <= shortest + third) {
        // Fastest third: set to green
        span.classList.add("fast");
    } else if (duration <= shortest + 2 * third) {
        // Middle third: set to yellow
        span.classList.add("medium");
    } else {
        // Slowest third: set to red
        span.classList.add("slow");
    }
}

function addSummary(canvasDiv, totalDurationInSeconds) {
    // Create a title for Compilation Statistics
    const titleDiv = document.createElement("div");
    titleDiv.className = "title";
    titleDiv.innerHTML = "<h1>Compilation Statistics</h1>";
    canvasDiv.appendChild(titleDiv);

    // Calculate total assemblies
    const totalAssemblies = compilationData.Entries.length;

    // Create a div for displaying total duration, total assemblies
    const summaryDiv = document.createElement("div");
    summaryDiv.className = "summary";

    // Display total duration
    const totalDurationDiv = document.createElement("div");
    totalDurationDiv.textContent = `Total Duration: ${totalDurationInSeconds.toFixed(2)} seconds`;

    // Display total assemblies
    const totalAssembliesDiv = document.createElement("div");
    totalAssembliesDiv.textContent = `Total Assemblies: ${totalAssemblies}`;

    // Append the total duration, total assemblies, and coupling metric to the summary div
    summaryDiv.appendChild(totalDurationDiv);
    summaryDiv.appendChild(totalAssembliesDiv);

    // Append the summary div to the canvas
    canvasDiv.appendChild(summaryDiv);
}

function addEntryInfo(entryContainer, entry) {
    const formattedDuration = parseFloat(entry.DurationInSeconds).toFixed(2);

    // Create a div to display the name, start time, and duration
    const infoDiv = document.createElement("div");
    infoDiv.innerHTML = `[${formattedDuration}s] ${entry.Name}`;
    infoDiv.className = "text-above";
    entryContainer.appendChild(infoDiv);
}

function addDurationBar(entryContainer, entry, shortestDuration, longestDuration) {
    // Calculate the width based on duration
    const width = Math.round(entry.DurationInSeconds * 750);

    // Create a new span element inside the container with the calculated width
    const span = document.createElement("span");
    span.style.width = `${width}px`;
    //span.style.left = `${left}%`;

    // Set the color based on duration using the function
    setStyleBasedOnDuration(span, shortestDuration, longestDuration, entry.DurationInSeconds);

    // Append the span to the container
    entryContainer.appendChild(span);
}

// Function to handle span click event
function handleSpanClick(entryContainer, entry) {
    // Print references and dependents to the console
    console.log(`References for ${entry.Name}:`, entry.References);
    console.log(`Dependents for ${entry.Name}:`, entry.Dependants);

    // Reset the colors for all containers
    clearSelection();

    if (currentlySelectedEntry == entry.Name) {
        currentlySelectedEntry = null;
        return;
    }

    hideAll();
    select(entry.Name);

    // Set the colors for the references containers to dependency
    entry.References.forEach((referenceName) => {
        const referenceContainer = entryContainerDict[referenceName];
        if (referenceContainer) {
            setDependencyColors(referenceContainer);
        }
    });

    setRecursiveDependantColors(entry);
}

// Function to reset colors for all containers
function clearSelection() {
    Object.values(entryContainerDict).forEach((container) => {
        container.classList.remove("dependency", "directDependant", "indirectDependant", "hidden", "selected");
    });

    const clearSelectionButton = document.getElementById("clearSelectionButton");
    clearSelectionButton.classList.add("hidden");
}

function hideAll() {
    Object.values(entryContainerDict).forEach((container) => {
        container.classList.add("hidden");
    });
}

function select(entryName) {
    currentlySelectedEntry = entryName;

    entryContainerDict[entryName].classList.remove("hidden");
    entryContainerDict[entryName].classList.add("selected");

    const clearSelectionButton = document.getElementById("clearSelectionButton");
    clearSelectionButton.classList.remove("hidden");
}

// Function to set dependency colors for a container
function setDependencyColors(container) {
    container.classList.remove("hidden");
    container.classList.add("dependency");
}

// Function to set dependant colors for a container
function setDependantColors(container, directDependant) {
    container.classList.remove("hidden");
    container.classList.add(directDependant ? "directDependant" : "indirectDependant");
}

// Function to recursively set dependant colors for an entry and its dependants
function setRecursiveDependantColors(entry, depth = 0) {
    // Limit recursion depth to prevent infinite loop
    if (depth >= 256) {
        return;
    }

    entry.Dependants.forEach((dependantName) => {
        const dependantEntry = compilationData.Entries.find((e) => e.Name === dependantName);
        if (dependantEntry) {
            const dependantContainer = entryContainerDict[dependantName];
            if (dependantContainer) {
                setDependantColors(dependantContainer, depth === 0);
                setRecursiveDependantColors(dependantEntry, depth + 1);
            }
        }
    });
}

function createClearSelectionButton() {
    const button = document.createElement("button");
    button.id = "clearSelectionButton";
    button.textContent = "Clear Selection";
    button.classList.add("hidden");
    
    // Add an event listener to clear the selection when the button is clicked
    button.addEventListener("click", clearSelection);

    return button;
}

const entryContainerDict = {};
let currentlySelectedEntry = null;

document.addEventListener("DOMContentLoaded", function () {
    // Get the "canvas" div by its id
    const canvasDiv = document.getElementById("canvas");

    // Calculate shortest and longest durations
    const { shortestDuration, longestDuration } = calculateDurations(
        compilationData.Entries
    );

    const totalDurationInSeconds = compilationData.TotalDurationInSeconds;
        
    addSummary(canvasDiv, totalDurationInSeconds);
 
    // Create the clear selection button
    const clearSelectionButton = createClearSelectionButton();
    canvasDiv.appendChild(clearSelectionButton);

    // Sort the entries by duration in ascending order
    compilationData.Entries.sort((a, b) => b.DurationInSeconds - a.DurationInSeconds);

    // Loop through each entry in the JSON data
    compilationData.Entries.forEach((entry) => {
        // remove the dll extension
        entry.Name = entry.Name.replace(".dll", "");

        // Create a new container div for each entry
        const entryContainer = document.createElement("div");
        entryContainer.className = "entry-container";

        addEntryInfo(entryContainer, entry);
        addDurationBar(entryContainer, entry, shortestDuration, longestDuration);

        // Attach a click event listener to the span
        entryContainer.addEventListener("click", () => {
            handleSpanClick(entryContainer, entry);
        });

        // Append the entry container to the "canvas" div
        canvasDiv.appendChild(entryContainer);
        entryContainerDict[entry.Name] = entryContainer;
    });

    // Function to format time as HH:MM:SS
    function formatTime(seconds) {
        const date = new Date(seconds * 1000); // Convert to milliseconds
        return date.toISOString().substr(11, 8); // Format as HH:MM:SS
    }
});
