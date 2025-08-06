const addBtn = document.getElementById("add-btn");
const formContainer = document.getElementById("form-container");
const input = document.getElementById("song-input");
const list = document.getElementById("song-list");

addBtn.addEventListener("click", () => {
	formContainer.classList.remove("hidden");
	input.focus();
});

input.addEventListener("keydown", async (e) => {
	if (e.key === "Enter") {
		const title = input.value.trim();
		if (!title) return;

		const items = list.querySelectorAll("li");
		const order = items.length;

		const { data, error } = await supabaseClient
			.from("songs")
			.insert([{ title, is_checked: false, order }])
			.select();

		if (error) {
			console.error("Gagal menambahkan:", error.message);
			return;
		}

		renderSong(data[0]);
		input.value = "";
		formContainer.classList.add("hidden");
	}
});

const fetchSongs = async () => {
	const { data, error } = await supabaseClient
		.from("songs")
		.select("*")
		.order("order", { ascending: true });

	if (error) {
		console.error("Gagal ambil lagu:", error.message);
		return;
	}

	list.innerHTML = "";
	data.forEach(renderSong);
};

const deleteSong = async (id, element) => {
	const { error } = await supabaseClient.from("songs").delete().eq("id", id);
	if (error) {
		console.error("Gagal menghapus:", error.message);
		return;
	}
	element.remove();
};

const updateSongTitle = async (id, newTitle, spanEl) => {
	const { error } = await supabaseClient
		.from("songs")
		.update({ title: newTitle })
		.eq("id", id);
	if (!error) spanEl.textContent = newTitle;
};

const toggleChecked = async (id, checked) => {
	await supabaseClient
		.from("songs")
		.update({ is_checked: checked })
		.eq("id", id);
};

function createTitleSpan(title, song, wrapper) {
	const span = document.createElement("span");
	span.textContent = title;
	span.className = "block w-full cursor-text";
	span.addEventListener("dblclick", () => {
		triggerEditMode(song, wrapper, span);
	});
	return span;
}

function triggerEditMode(song, titleWrapper, oldSpan) {
	document.querySelectorAll(".song-edit-input").forEach((inputEl) => {
		const originalTitle = inputEl.dataset.originalTitle;
		const parent = inputEl.parentElement;
		const songId = inputEl.dataset.songId;
		const span = createTitleSpan(
			originalTitle,
			{ id: songId, title: originalTitle },
			parent
		);
		parent.replaceChild(span, inputEl);
	});

	const inputEdit = document.createElement("input");
	inputEdit.type = "text";
	inputEdit.value = song.title;
	inputEdit.dataset.originalTitle = song.title;
	inputEdit.dataset.songId = song.id;
	inputEdit.className =
		"song-edit-input w-full px-2 py-1 rounded bg-slate-700 text-white border border-slate-500 outline-none";

	titleWrapper.replaceChild(inputEdit, oldSpan);
	inputEdit.focus();

	inputEdit.addEventListener("keydown", async (e) => {
		if (e.key === "Enter") {
			const newTitle = inputEdit.value.trim();
			if (!newTitle || newTitle === song.title) {
				const restored = createTitleSpan(song.title, song, titleWrapper);
				titleWrapper.replaceChild(restored, inputEdit);
				return;
			}

			await updateSongTitle(song.id, newTitle, oldSpan);
			song.title = newTitle;
			const updatedSpan = createTitleSpan(newTitle, song, titleWrapper);
			titleWrapper.replaceChild(updatedSpan, inputEdit);
		}
	});
}

const renderSong = (song, index = 0) => {
	const li = document.createElement("li");
	li.dataset.id = song.id;
	li.className =
		"bg-slate-800 p-2 rounded border border-slate-600 text-white flex items-center space-x-2 opacity-0";
	li.style.animationDelay = `${index * 80}ms`;
	li.classList.add("slide-in-left");

	const dragIcon = document.createElement("span");
	dragIcon.innerHTML = "&#9776;";
	dragIcon.className = "drag-handle cursor-grab pr-2 text-slate-400";
	li.prepend(dragIcon);

	const titleWrapper = document.createElement("div");
	titleWrapper.className =
		"flex-[6] p-2 cursor-text hover:bg-slate-700 rounded";
	const titleSpan = createTitleSpan(song.title, song, titleWrapper);
	titleWrapper.appendChild(titleSpan);

	const checkWrapper = document.createElement("div");
	checkWrapper.className = "flex-[1] flex justify-center";
	const checkbox = document.createElement("input");
	checkbox.type = "checkbox";
	checkbox.checked = song.is_checked;
	checkbox.className = "form-checkbox w-4 h-4 text-sky-400";
	checkbox.addEventListener("change", () => {
		toggleChecked(song.id, checkbox.checked);
	});
	checkWrapper.appendChild(checkbox);

	const deleteWrapper = document.createElement("div");
	deleteWrapper.className = "flex-[1] flex justify-end";
	const deleteBtn = document.createElement("button");
	deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
	deleteBtn.className =
		"text-slate-400 px-2 hover:text-slate-300 text-base ml-2";
	deleteBtn.addEventListener("click", () => {
		deleteSong(song.id, li);
	});
	deleteWrapper.appendChild(deleteBtn);

	li.appendChild(titleWrapper);
	li.appendChild(checkWrapper);
	li.appendChild(deleteWrapper);
	list.appendChild(li);
};

window.addEventListener("DOMContentLoaded", fetchSongs);

const tanggalElemen = document.getElementById("tanggal");

const formatTanggal = () => {
	const tanggal = new Date();
	const hari = tanggal.toLocaleDateString("id-ID", { weekday: "long" });
	const tanggalAngka = tanggal.getDate();
	const bulan = tanggal.toLocaleDateString("id-ID", { month: "long" });
	const tahun = tanggal.getFullYear();
	return `${hari}, ${tanggalAngka} ${bulan} ${tahun}`;
};

tanggalElemen.textContent = formatTanggal();

new Sortable(list, {
	animation: 150,
	handle: ".drag-handle",
	onEnd: async () => {
		const items = list.querySelectorAll("li");
		const updates = [];

		items.forEach((item, index) => {
			const id = item.dataset.id;
			updates.push({ id, order: index });
		});

		const { error } = await supabaseClient.rpc("batch_update_order", {
			updates: updates,
		});

		if (error) console.error("Update order gagal:", error.message);
	},
});
