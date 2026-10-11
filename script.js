
const taskInput = document.getElementById("taskinput");
const addTaskButton = document.getElementById("addtaskbutton");
const taskList = document.getElementById("taskList");

const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");

const currentTab = document.getElementById("currentTab");
const savedTab = document.getElementById("savedTab");
const currentView = document.getElementById("currentView");
const savedView = document.getElementById("savedView");

const saveListButton = document.getElementById("saveListButton");
const deleteListButton = document.getElementById("deleteListButton");
const taskCount = document.getElementById("taskCount");
const savedCount = document.getElementById("savedCount");
const savedLists = document.getElementById("savedLists");
const emptySaved = document.getElementById("emptySaved");
const statusMessage = document.getElementById("statusMessage");

// Custom popup elements
const modalOverlay = document.getElementById("modalOverlay");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");
const modalIcon = document.getElementById("modalIcon");
const modalInput = document.getElementById("modalInput");
const modalCancel = document.getElementById("modalCancel");
const modalConfirm = document.getElementById("modalConfirm");

const TASKS_KEY = "taskflow-tasks";
const SAVED_LISTS_KEY = "taskflow-saved-lists";
const THEME_KEY = "taskflow-theme";

let activeListId = null;
let tasks = readStorage(TASKS_KEY, []);
let lists = readStorage(SAVED_LISTS_KEY, []);
let modalCallback = null;

// Create the New List button automatically
const newListButton = document.createElement("button");
newListButton.id = "newListButton";
newListButton.className = "new-list-button";
newListButton.textContent = "+ New List";
savedView.prepend(newListButton);

// Custom popup
function showModal(options, callback) {
    modalTitle.textContent = options.title;
    modalMessage.textContent = options.message;
    modalIcon.textContent = options.icon || "✦";
    modalConfirm.textContent = options.confirmText || "Confirm";

    modalInput.hidden = !options.input;
    modalInput.value = options.defaultValue || "";
    modalInput.placeholder = options.placeholder || "";

    modalCallback = callback || null;
    modalOverlay.hidden = false;

    if (options.input) {
        modalInput.focus();
        modalInput.select();
    } else {
        modalConfirm.focus();
    }
}

function closeModal() {
    modalOverlay.hidden = true;
    modalCallback = null;
}

modalConfirm.addEventListener("click", function () {
    const callback = modalCallback;
    const value = modalInput.value.trim();

    if (!modalInput.hidden && !value) {
        modalInput.focus();
        return;
    }

    closeModal();

    if (callback) {
        callback(value);
    }
});

modalCancel.addEventListener("click", closeModal);

modalOverlay.addEventListener("click", function (event) {
    if (event.target === modalOverlay) {
        closeModal();
    }
});

modalInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") modalConfirm.click();
    if (event.key === "Escape") closeModal();
});

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !modalOverlay.hidden) {
        closeModal();
    }
});

// Load saved theme
if (localStorage.getItem(THEME_KEY) === "dark") {
    document.body.classList.add("dark");
}

updateThemeIcon();

themeToggle.addEventListener("click", function () {
    document.body.classList.toggle("dark");

    localStorage.setItem(
        THEME_KEY,
        document.body.classList.contains("dark") ? "dark" : "light"
    );

    updateThemeIcon();
});

function updateThemeIcon() {
    themeIcon.textContent =
        document.body.classList.contains("dark") ? "☀" : "☾";
}

// Safely read saved data
function readStorage(key, fallback) {
    try {
        const data = JSON.parse(localStorage.getItem(key));
        return Array.isArray(data) ? data : fallback;
    } catch {
        return fallback;
    }
}

// Save current tasks and update the active saved list
function saveTasks() {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));

    if (activeListId !== null) {
        const savedList = lists.find(function (list) {
            return list.id === activeListId;
        });

        if (savedList) {
            savedList.tasks = tasks.map(function (task) {
                return { ...task };
            });

            localStorage.setItem(
                SAVED_LISTS_KEY,
                JSON.stringify(lists)
            );
        }
    }
}

// Switch to the Current Tasks tab
function showCurrentView() {
    currentView.hidden = false;
    savedView.hidden = true;

    currentTab.classList.add("active");
    savedTab.classList.remove("active");
}

// Switch to the Saved Lists tab
function showSavedView() {
    currentView.hidden = true;
    savedView.hidden = false;

    currentTab.classList.remove("active");
    savedTab.classList.add("active");

    renderSavedLists();
}

// Create a new, empty list
newListButton.addEventListener("click", function () {
    showModal({
        title: "Create a new list",
        message: "Give your new list a name.",
        icon: "＋",
        input: true,
        placeholder: "Enter list name",
        confirmText: "Create list"
    }, function (name) {
        function createList() {
            const newList = {
                id: Date.now() + Math.random(),
                name: name,
                tasks: []
            };

            lists.push(newList);
            activeListId = newList.id;
            tasks = [];

            saveTasks();

            localStorage.setItem(
                SAVED_LISTS_KEY,
                JSON.stringify(lists)
            );

            renderTasks();
            renderSavedLists();
            showCurrentView();

            statusMessage.textContent = `"${name}" created.`;
            taskInput.focus();
        }

        if (tasks.length > 0) {
            showModal({
                title: "Start a new list?",
                message: "Your current tasks will be replaced in the current view. Saved lists will not be deleted.",
                icon: "＋",
                confirmText: "Create list"
            }, createList);
        } else {
            createList();
        }
    });
});

// Add a task
function addTask() {
    const text = taskInput.value.trim();

    if (!text) {
        taskInput.focus();
        return;
    }

    tasks.push({
        id: Date.now() + Math.random(),
        text: text,
        completed: false
    });

    taskInput.value = "";
    statusMessage.textContent = "";

    saveTasks();
    renderTasks();
    taskInput.focus();
}

addTaskButton.addEventListener("click", addTask);

taskInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") addTask();
});

// Display tasks with drag-and-drop reordering
function renderTasks() {
    taskList.replaceChildren();

    tasks.forEach(function (task) {
        const li = document.createElement("li");
        const dragHandle = document.createElement("span");
        const checkbox = document.createElement("input");
        const label = document.createElement("span");
        const deleteButton = document.createElement("button");

        li.draggable = true;
        li.dataset.taskId = String(task.id);

        dragHandle.textContent = "⠿";
        dragHandle.className = "task-drag-handle";
        dragHandle.title = "Drag to reorder";
        dragHandle.setAttribute("aria-label", "Drag to reorder task");

        checkbox.type = "checkbox";
        checkbox.checked = task.completed;
        checkbox.setAttribute("aria-label", "Mark task complete");

        label.textContent = task.text;
        label.style.flex = "1";

        if (task.completed) {
            label.style.color = "var(--muted)";
            label.style.textDecoration = "line-through";
        }

        checkbox.addEventListener("change", function () {
            task.completed = checkbox.checked;
            saveTasks();
            renderTasks();
        });

        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", function () {
            tasks = tasks.filter(function (item) {
                return item.id !== task.id;
            });

            saveTasks();
            renderTasks();
        });

        li.addEventListener("dragstart", function (event) {
            event.dataTransfer.setData("text/plain", String(task.id));
            event.dataTransfer.effectAllowed = "move";
            li.classList.add("dragging");
        });

        li.addEventListener("dragend", function () {
            li.classList.remove("dragging");

            taskList.querySelectorAll("li").forEach(function (item) {
                item.classList.remove("drag-over");
            });
        });

        li.addEventListener("dragover", function (event) {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";

            taskList.querySelectorAll("li").forEach(function (item) {
                item.classList.remove("drag-over");
            });

            if (!li.classList.contains("dragging")) {
                li.classList.add("drag-over");
            }
        });

        li.addEventListener("dragleave", function (event) {
            if (!li.contains(event.relatedTarget)) {
                li.classList.remove("drag-over");
            }
        });

        li.addEventListener("drop", function (event) {
            event.preventDefault();

            const draggedId = event.dataTransfer.getData("text/plain");

            const oldIndex = tasks.findIndex(function (item) {
                return String(item.id) === draggedId;
            });

            const newIndex = tasks.findIndex(function (item) {
                return item.id === task.id;
            });

            if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
                return;
            }

            const movedTask = tasks.splice(oldIndex, 1)[0];
            tasks.splice(newIndex, 0, movedTask);

            saveTasks();
            renderTasks();
        });

        li.append(dragHandle, checkbox, label, deleteButton);
        taskList.appendChild(li);
    });

    const remaining = tasks.filter(function (task) {
        return !task.completed;
    }).length;

    taskCount.textContent =
        `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}` +
        (tasks.length ? ` · ${remaining} left` : "");
}

// Tab buttons
currentTab.addEventListener("click", showCurrentView);
savedTab.addEventListener("click", showSavedView);

// Save current list with a name
saveListButton.addEventListener("click", function () {
    if (tasks.length === 0) {
        statusMessage.textContent = "Add some tasks before saving your list.";
        return;
    }

    showModal({
        title: "Save your list",
        message: "Choose a name for your saved list.",
        icon: "✦",
        input: true,
        placeholder: "Enter list name",
        confirmText: "Save list"
    }, function (name) {
        const savedList = {
            id: Date.now() + Math.random(),
            name: name,
            tasks: tasks.map(function (task) {
                return { ...task };
            })
        };

        lists.push(savedList);
        activeListId = savedList.id;

        localStorage.setItem(
            SAVED_LISTS_KEY,
            JSON.stringify(lists)
        );

        statusMessage.textContent = `"${name}" saved successfully.`;
        renderSavedLists();
    });
});

// Clear current list
deleteListButton.addEventListener("click", function () {
    if (tasks.length === 0) {
        statusMessage.textContent = "Your current list is already empty.";
        return;
    }

    showModal({
        title: "Delete current list?",
        message: "This will remove all tasks from your current list. Saved copies will not be deleted.",
        icon: "!",
        confirmText: "Delete list"
    }, function () {
        tasks = [];
        activeListId = null;

        saveTasks();
        renderTasks();

        statusMessage.textContent = "Current list cleared.";
    });
});

// Display saved lists, with Load, Rename, and Delete buttons
function renderSavedLists() {
    savedLists.replaceChildren();

    savedCount.textContent =
        `${lists.length} ${lists.length === 1 ? "saved list" : "saved lists"}`;

    emptySaved.hidden = lists.length > 0;

    lists.forEach(function (list) {
        const item = document.createElement("div");
        const info = document.createElement("div");
        const name = document.createElement("div");
        const details = document.createElement("div");
        const actions = document.createElement("div");
        const loadButton = document.createElement("button");
        const renameButton = document.createElement("button");
        const deleteButton = document.createElement("button");

        item.className = "saved-list-item";
        info.className = "saved-list-info";
        name.className = "saved-list-name";
        details.className = "saved-list-details";
        actions.className = "saved-list-actions";

        name.textContent = list.name;

        const total = list.tasks.length;
        const completed = list.tasks.filter(function (task) {
            return task.completed;
        }).length;

        details.textContent =
            `${total} ${total === 1 ? "task" : "tasks"}` +
            (total ? ` · ${completed} completed` : "");

        // Load a saved list
        loadButton.textContent = "Load";

        loadButton.addEventListener("click", function () {
            function loadList() {
                tasks = list.tasks.map(function (task) {
                    return { ...task };
                });

                activeListId = list.id;

                saveTasks();
                renderTasks();
                renderSavedLists();
                showCurrentView();

                statusMessage.textContent = `"${list.name}" loaded.`;
            }

            if (tasks.length > 0) {
                showModal({
                    title: "Replace current list?",
                    message: `Load "${list.name}" and replace your current tasks?`,
                    icon: "↻",
                    confirmText: "Load list"
                }, loadList);
            } else {
                loadList();
            }
        });

        // Rename a saved list
        renameButton.textContent = "Rename";

        renameButton.addEventListener("click", function () {
            showModal({
                title: "Rename saved list",
                message: "Enter a new name for this list.",
                icon: "✎",
                input: true,
                defaultValue: list.name,
                placeholder: "Enter list name",
                confirmText: "Rename"
            }, function (newName) {
                list.name = newName;

                localStorage.setItem(
                    SAVED_LISTS_KEY,
                    JSON.stringify(lists)
                );

                renderSavedLists();
                statusMessage.textContent = `List renamed to "${newName}".`;
            });
        });

        // Delete a saved list
        deleteButton.textContent = "Delete";
        deleteButton.className = "remove-saved";

        deleteButton.addEventListener("click", function () {
            showModal({
                title: "Delete saved list?",
                message: `Are you sure you want to delete "${list.name}"? This cannot be undone.`,
                icon: "!",
                confirmText: "Delete"
            }, function () {
                lists = lists.filter(function (savedList) {
                    return savedList.id !== list.id;
                });

                if (activeListId === list.id) {
                    activeListId = null;
                }

                localStorage.setItem(
                    SAVED_LISTS_KEY,
                    JSON.stringify(lists)
                );

                renderSavedLists();
                statusMessage.textContent = `"${list.name}" deleted.`;
            });
        });

        info.append(name, details);
        actions.append(loadButton, renameButton, deleteButton);
        item.append(info, actions);
        savedLists.appendChild(item);
    });
}

// Initial display
renderTasks();
renderSavedLists();