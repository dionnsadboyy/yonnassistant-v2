console.log("FINANCE PAGE READY 🔥");
console.log("FINANCE JS V2");

const loadTransactions = async () => {
  const { data, error } = await supabaseClient.from("transactions").select("*");

  console.log("TRANSACTIONS:", data);
  transactionsList.innerHTML = "";

  data.forEach((item) => {
    const div = document.createElement("div");

    div.innerHTML = `
  <h3>${item.type}</h3>
  <p>${item.description}</p>
  <span>Rp ${item.amount}</span>

  <button
    class="delete-btn"
    data-id="${item.id}"
  >
    Hapus
  </button>

  <button
  class="edit-btn"
  data-id="${item.id}"
>
  Edit
</button>
`;

    transactionsList.appendChild(div);
    const deleteBtn = div.querySelector(".delete-btn");

    deleteBtn.addEventListener("click", () => {
      const confirmDelete = confirm("Hapus transaksi?");

      if (!confirmDelete) return;

      deleteTransaction(item.id);
    });
    const editBtn = div.querySelector(".edit-btn");
    editBtn.addEventListener("click", async () => {
      const newDescription = prompt("Edit deskripsi:", item.description);

      if (!newDescription) return;

      await updateTransaction(item.id, newDescription);
    });
  });
  console.log("ERROR:", error);

  data.forEach((item) => {
    console.log(item.type, item.amount, item.description);
  });
};
const transactionsList = document.querySelector("#transactionsList");

// LOAD ALL DATAAA
const transactionType = document.querySelector("#transactionType");
const transactionAmount = document.querySelector("#transactionAmount");
const transactionDescription = document.querySelector(
  "#transactionDescription",
);
const saveTransactionBtn = document.querySelector("#saveTransactionBtn");
loadTransactions();

// SAVEEE DATAA
const saveTransaction = async () => {
  const type = transactionType.value;
  const amount = Number(transactionAmount.value);
  const description = transactionDescription.value.trim();

  if (!amount || !description) return;

  const { error } = await supabaseClient.from("transactions").insert([
    {
      type,
      amount,
      description,
    },
  ]);

  if (error) {
    console.error(error);
    return;
  }

  loadTransactions();

  transactionAmount.value = "";
  transactionDescription.value = "";

  console.log("TRANSAKSI BERHASIL 🔥");
};

// DELETE DATA
const deleteTransaction = async (id) => {
  const { error } = await supabaseClient
    .from("transactions")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);
    return;
  }

  console.log("TRANSAKSI DIHAPUS 🔥");

  loadTransactions();
};
// UPDATE DATA
const updateTransaction = async (id, description) => {
  const { error } = await supabaseClient
    .from("transactions")
    .update({
      description,
    })
    .eq("id", id);

  if (error) {
    console.error(error);
    return;
  }

  console.log("TRANSAKSI DIUPDATE 🔥");

  loadTransactions();
};
saveTransactionBtn.addEventListener("click", saveTransaction);
