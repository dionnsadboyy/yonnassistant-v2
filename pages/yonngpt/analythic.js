/* =========================================================
   YONN ANALYTICS ENGINE
========================================================= */

window.YonnAnalytics = {
  transactions: [],

  async load() {
    const { data, error } = await supabaseClient
      .from("transactions")
      .select(
        `
          id,
          transaction_date,
          type,
          amount,
          note,
          created_at,
          categories(name),
          wallets(name)
        `,
      )
      .order("transaction_date", {
        ascending: false,
      });

    if (error) {
      console.error(error);

      this.transactions = [];

      return [];
    }

    this.transactions = data || [];

    return this.transactions;
  },

  getCurrentMonthRows() {
    const now = new Date();

    return this.transactions.filter((row) => {
      const d = new Date(row.transaction_date);

      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    });
  },

  getWeeklyRows() {
    const now = new Date();

    const weekAgo = new Date();

    weekAgo.setDate(now.getDate() - 7);

    return this.transactions.filter((row) => {
      const d = new Date(row.transaction_date);

      return d >= weekAgo;
    });
  },

  getBalance() {
    let balance = 0;

    this.transactions.forEach((item) => {
      const amount = Number(item.amount || 0);

      if (item.type === "income") {
        balance += amount;
      } else {
        balance -= amount;
      }
    });

    return balance;
  },

  getMonthlyExpense() {
    return this.getCurrentMonthRows()
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  },

  getWeeklyExpense() {
    return this.getWeeklyRows()
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  },

  getTopCategory() {
    const map = {};

    this.getCurrentMonthRows()
      .filter((t) => t.type === "expense")
      .forEach((row) => {
        const category = row.categories?.name || "Lainnya";

        map[category] = (map[category] || 0) + Number(row.amount || 0);
      });

    const result = Object.entries(map).sort((a, b) => b[1] - a[1])[0];

    if (!result) return null;

    return {
      category: result[0],

      amount: result[1],
    };
  },

  getCategoryExpense(categoryName) {
    return this.getCurrentMonthRows()
      .filter((row) => {
        return (
          row.type === "expense" &&
          (row.categories?.name || "")
            .toLowerCase()
            .includes(categoryName.toLowerCase())
        );
      })
      .reduce((sum, row) => sum + Number(row.amount || 0), 0);
  },

  getWalletRanking() {
    const map = {};

    this.transactions.forEach((row) => {
      const wallet = row.wallets?.name || "Unknown";

      map[wallet] = (map[wallet] || 0) + Number(row.amount || 0);
    });

    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  },

  generateInsight() {
    const top = this.getTopCategory();

    const monthly = this.getMonthlyExpense();

    const cigarette = this.getCategoryExpense("rokok");

    return {
      topCategory: top,

      monthlyExpense: monthly,

      cigaretteExpense: cigarette,
    };
  },
};
