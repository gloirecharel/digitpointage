const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mysql = require("mysql2/promise");
const crypto = require("crypto");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 5173;
const HOST = process.env.HOST || "localhost";
const JWT_SECRET = process.env.JWT_SECRET || "MAPASSA_SECRET_CHANGE_ME";

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

const DB_CONFIG = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "mapassa",
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  charset: "utf8mb4",
};

const pool = mysql.createPool(DB_CONFIG);

async function ensureDatabase() {
  const adminPool = mysql.createPool({
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    user: DB_CONFIG.user,
    password: DB_CONFIG.password,
    connectionLimit: 1,
    charset: "utf8mb4",
  });

  try {
    await adminPool.query(`CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`Base MySQL prête : ${DB_CONFIG.database}`);
  } finally {
    await adminPool.end();
  }
}

async function query(sql, params = []) {
  return pool.execute(sql, params);
}

async function run(sql, params = []) {
  const [result] = await query(sql, params);
  return { id: result.insertId || null, changes: result.affectedRows || 0 };
}

async function get(sql, params = []) {
  const [rows] = await query(sql, params);
  return rows[0] || null;
}

async function all(sql, params = []) {
  const [rows] = await query(sql, params);
  return rows;
}

async function ensureColumn(table, column, definition) {
  try {
    const [rows] = await query(
      `SELECT COUNT(*) AS count
       FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
      [table, column]
    );

    if (Number(rows[0].count) === 0) {
      await run(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
      console.log(`Migration OK : ${table}.${column}`);
    }
  } catch (err) {
    console.log(`Migration ignorée : ${table}.${column} -> ${err.message}`);
  }
}

async function migrateDb() {
  await ensureColumn("clients", "piece_type", "TEXT");
  await ensureColumn("clients", "piece_number", "TEXT");
  await ensureColumn("clients", "phone", "TEXT");
  await ensureColumn("clients", "address", "TEXT");
  await ensureColumn("clients", "account_type", "VARCHAR(255) DEFAULT 'CARTE_CLASSIQUE'");
  await ensureColumn("clients", "fixed_amount", "DECIMAL(15,2) DEFAULT 0");
  await ensureColumn("clients", "status", "VARCHAR(50) DEFAULT 'ACTIVE'");
  await ensureColumn("clients", "password_hash", "TEXT");
  await ensureColumn("clients", "created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");

  await ensureColumn("employees", "phone", "TEXT");
  await ensureColumn("employees", "email", "TEXT");
  await ensureColumn("employees", "address", "TEXT");
  await ensureColumn("employees", "job_title", "TEXT");
  await ensureColumn("employees", "department", "TEXT");
  await ensureColumn("employees", "hire_date", "DATE");
  await ensureColumn("employees", "base_salary", "DECIMAL(15,2) DEFAULT 0");
  await ensureColumn("employees", "status", "VARCHAR(50) DEFAULT 'ACTIVE'");
  await ensureColumn("employees", "created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");

  await ensureColumn("transactions", "reason", "TEXT");
  await ensureColumn("transactions", "created_by", "INT");
  await ensureColumn("transactions", "created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");

  await ensureColumn("payrolls", "bonus", "DECIMAL(15,2) DEFAULT 0");
  await ensureColumn("payrolls", "transport", "DECIMAL(15,2) DEFAULT 0");
  await ensureColumn("payrolls", "deductions", "DECIMAL(15,2) DEFAULT 0");
  await ensureColumn("payrolls", "advance", "DECIMAL(15,2) DEFAULT 0");
  await ensureColumn("payrolls", "cnss", "DECIMAL(15,2) DEFAULT 0");
  await ensureColumn("payrolls", "irpp", "DECIMAL(15,2) DEFAULT 0");
  await ensureColumn("payrolls", "net_salary", "DECIMAL(15,2) DEFAULT 0");
  await ensureColumn("payrolls", "paid_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");

  await ensureColumn("users", "role", "VARCHAR(50) DEFAULT 'ADMIN'");
  await ensureColumn("users", "status", "VARCHAR(50) DEFAULT 'ACTIVE'");
  await ensureColumn("users", "created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");

  await ensureColumn("cash_movements", "type", "VARCHAR(50)");
  await ensureColumn("cash_movements", "amount", "DECIMAL(15,2) DEFAULT 0");
  await ensureColumn("cash_movements", "reason", "TEXT");
  await ensureColumn("cash_movements", "reference", "TEXT");
  await ensureColumn("cash_movements", "created_by", "INT");
  await ensureColumn("cash_movements", "created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
}

async function initDb() {
  await run(`CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'ADMIN',
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`CREATE TABLE IF NOT EXISTS clients (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    piece_type TEXT,
    piece_number TEXT,
    phone TEXT,
    address TEXT,
    account_type VARCHAR(255) NOT NULL,
    fixed_amount DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    password_hash TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`CREATE TABLE IF NOT EXISTS transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    client_id INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    reason TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  )`);

  await run(`CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    client_id INT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'PENDING',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    validated_at TIMESTAMP NULL,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  )`);

  await run(`CREATE TABLE IF NOT EXISTS employees (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    job_title TEXT,
    department TEXT,
    hire_date DATE,
    base_salary DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`CREATE TABLE IF NOT EXISTS payrolls (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    month VARCHAR(50) NOT NULL,
    base_salary DECIMAL(15,2) DEFAULT 0,
    bonus DECIMAL(15,2) DEFAULT 0,
    transport DECIMAL(15,2) DEFAULT 0,
    deductions DECIMAL(15,2) DEFAULT 0,
    advance DECIMAL(15,2) DEFAULT 0,
    cnss DECIMAL(15,2) DEFAULT 0,
    irpp DECIMAL(15,2) DEFAULT 0,
    net_salary DECIMAL(15,2) DEFAULT 0,
    paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(255),
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`CREATE TABLE IF NOT EXISTS cash_movements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    type VARCHAR(50) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    reason TEXT,
    reference TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`CREATE TABLE IF NOT EXISTS operating_cash_movements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    type VARCHAR(50) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    reason TEXT,
    reference TEXT,
    source VARCHAR(100) DEFAULT 'MANUEL',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  await migrateDb();

  const admin = await get("SELECT id FROM users WHERE username = ?", ["admin"]);
  if (!admin) {
    const hash = await bcrypt.hash("admin123", 10);
    await run("INSERT INTO users(full_name, username, password_hash, role) VALUES(?,?,?,?)", [
      "Administrateur DigitPointage",
      "admin",
      hash,
      "SUPER_ADMIN",
    ]);
  }
}

function hasRole(user, allowedRoles = []) {
  if (!user) return false;
  const role = String(user.role || "").toUpperCase();
  return role === "SUPER_ADMIN" || allowedRoles.includes(role);
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (hasRole(req.user, roles)) return next();
    return res.status(403).json({ message: "Accès refusé pour votre profil utilisateur" });
  };
}

function parseDateValue(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const text = String(value);
  const date = new Date(text.includes('T') ? text : text.replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeOptionalValue(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

function generateTemporaryPassword() {
  return `DP-${crypto.randomBytes(6).toString("hex")}`;
}

async function logAction(userId, action, details=""){
  try { await run("INSERT INTO audit_logs(user_id, action, details) VALUES(?,?,?)", [userId, action, details]); } catch(e){}
}


async function addOperatingCashMovement(type, amount, reason, reference, userId, source='MANUEL') {
  await run("INSERT INTO operating_cash_movements(type,amount,reason,reference,created_by,source) VALUES(?,?,?,?,?,?)",
    [type, Number(amount||0), reason || '', reference || '', userId || null, source]);
}

function auth(req,res,next){
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if(!token) return res.status(401).json({message:"Token manquant"});
  try{
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  }catch(e){
    res.status(401).json({message:"Session expirée"});
  }
}

app.get("/", (req,res)=>res.redirect("/frontend/index.html"));

app.post("/api/login", async (req,res)=>{
  try{
    const {username,password} = req.body;
    const user = await get("SELECT * FROM users WHERE username=? AND status='ACTIVE'", [username]);
    if(!user) return res.status(401).json({message:"Identifiants incorrects"});
    const ok = await bcrypt.compare(password, user.password_hash);
    if(!ok) return res.status(401).json({message:"Identifiants incorrects"});
    const payload = {id:user.id, full_name:user.full_name, username:user.username, role:user.role};
    const token = jwt.sign(payload, JWT_SECRET, {expiresIn:"8h"});
    await logAction(user.id, "CONNEXION", "Connexion utilisateur");
    res.json({token, user:payload});
  }catch(err){ res.status(500).json({message:"Erreur serveur", error:err.message}); }
});

app.post("/api/client/login", async (req,res)=>{
  try{
    const {code,password} = req.body;
    const normalizedCode = String(code || "").trim();
    if(!normalizedCode || !password) return res.status(400).json({message:"Code client et mot de passe obligatoires"});

    const client = await get("SELECT * FROM clients WHERE code=? AND status='ACTIVE'", [normalizedCode]);
    if(!client) return res.status(401).json({message:"Code client invalide"});

    if (!client.password_hash) {
      const fallback = await bcrypt.hash(normalizedCode, 10);
      const sameAsCode = await bcrypt.compare(password, fallback);
      if (!sameAsCode) {
        return res.status(401).json({message:"Mot de passe client incorrect"});
      }
      await run("UPDATE clients SET password_hash=? WHERE id=?", [fallback, client.id]);
    } else {
      const ok = await bcrypt.compare(password, client.password_hash);
      if(!ok) return res.status(401).json({message:"Mot de passe client incorrect"});
    }

    const payload = {id: client.id, full_name: client.full_name, username: client.code, role: "CLIENT"};
    const token = jwt.sign(payload, JWT_SECRET, {expiresIn:"8h"});
    await logAction(client.id, "CONNEXION_CLIENT", `Connexion client ${client.code}`);
    res.json({token, user: payload});
  }catch(err){ res.status(500).json({message:"Erreur connexion client", error:err.message}); }
});

app.get("/api/client/dashboard", auth, requireRole("CLIENT"), async (req,res)=>{
  try{
    const client = await get("SELECT * FROM clients WHERE id=?", [req.user.id]);
    if(!client) return res.status(404).json({message:"Client introuvable"});

    const deposits = (await get("SELECT COALESCE(SUM(amount),0) total FROM transactions WHERE client_id=? AND type='DEPOT'", [req.user.id])).total || 0;
    const withdrawals = (await get("SELECT COALESCE(SUM(amount),0) total FROM transactions WHERE client_id=? AND type='RETRAIT'", [req.user.id])).total || 0;
    const history = await all("SELECT * FROM transactions WHERE client_id=? ORDER BY id DESC", [req.user.id]);
    const pending = await all("SELECT * FROM withdrawal_requests WHERE client_id=? ORDER BY id DESC", [req.user.id]);

    res.json({
      client,
      totalDeposits: Number(deposits),
      totalWithdrawals: Number(withdrawals),
      balance: Number(deposits) - Number(withdrawals),
      depositCount: Number((await get("SELECT COUNT(*) total FROM transactions WHERE client_id=? AND type='DEPOT'", [req.user.id])).total || 0),
      withdrawals: history.filter(item => item.type === 'RETRAIT'),
      pendingWithdrawals: pending,
      upcomingWithdrawal: Math.max(0, Number(deposits) - Number(withdrawals))
    });
  }catch(err){ res.status(500).json({message:"Erreur espace client", error:err.message}); }
});

app.post("/api/client/withdrawal-requests", auth, requireRole("CLIENT"), async (req,res)=>{
  try{
    const {amount,reason} = req.body;
    if(!amount || Number(amount) <= 0) return res.status(400).json({message:"Montant invalide"});
    if(!reason) return res.status(400).json({message:"Motif obligatoire"});

    const client = await get("SELECT * FROM clients WHERE id=?", [req.user.id]);
    if(!client) return res.status(404).json({message:"Client introuvable"});

    const deposits = Number((await get("SELECT COALESCE(SUM(amount),0) total FROM transactions WHERE client_id=? AND type='DEPOT'", [req.user.id])).total || 0);
    const withdrawals = Number((await get("SELECT COALESCE(SUM(amount),0) total FROM transactions WHERE client_id=? AND type='RETRAIT'", [req.user.id])).total || 0);
    const balance = deposits - withdrawals;

    if(Number(amount) > balance) return res.status(400).json({message:"Solde insuffisant pour ce retrait"});

    await run("INSERT INTO withdrawal_requests(client_id,amount,reason,status) VALUES(?,?,?,'PENDING')", [req.user.id, Number(amount), reason]);
    res.json({message:"Demande de retrait envoyée"});
  }catch(err){ res.status(500).json({message:"Erreur demande retrait", error:err.message}); }
});

app.get("/api/dashboard", auth, requireRole("ADMIN","CAISSIER","RH","CONSULTATION"), async (req,res)=>{
  try{
    const q = async sql => {
      const row = await get(sql);
      return Number((row && row.total) || 0);
    };

    const totalClients = await q("SELECT COUNT(*) total FROM clients");
    const carteClassique = await q("SELECT COUNT(*) total FROM clients WHERE account_type='CARTE_CLASSIQUE'");
    const compteLibre = await q("SELECT COUNT(*) total FROM clients WHERE account_type='COMPTE_LIBRE'");
    const totalEmployees = await q("SELECT COUNT(*) total FROM employees");
    const totalDeposits = await q("SELECT COALESCE(SUM(amount),0) total FROM transactions WHERE type='DEPOT'");
    const totalWithdrawals = await q("SELECT COALESCE(SUM(amount),0) total FROM transactions WHERE type='RETRAIT'");
    const pendingWithdrawals = await q("SELECT COUNT(*) total FROM withdrawal_requests WHERE status='PENDING'");
    const companyProfit = await q("SELECT COALESCE(SUM(fixed_amount),0) total FROM clients WHERE account_type='CARTE_CLASSIQUE'");
    const payrollMass = await q("SELECT COALESCE(SUM(net_salary),0) total FROM payrolls");

    let cashBalance = 0;
    try {
      const cashIn = await q("SELECT COALESCE(SUM(amount),0) total FROM cash_movements WHERE type='ENTREE'");
      const cashOut = await q("SELECT COALESCE(SUM(amount),0) total FROM cash_movements WHERE type='SORTIE'");
      cashBalance = cashIn - cashOut;
    } catch(e) {
      cashBalance = 0;
    }

    res.json({

      totalClients,
      carteClassique,
      compteLibre,
      totalEmployees,
      totalDeposits,
      totalWithdrawals,
      pendingWithdrawals,
      companyProfit,
      payrollMass,
      cashBalance,
      balance: totalDeposits - totalWithdrawals - payrollMass,
      clients: totalClients,
      cards: carteClassique,
      free: compteLibre,
      employees: totalEmployees,
      deposits: totalDeposits,
      withdrawals: totalWithdrawals,
      pending: pendingWithdrawals,
      profit: companyProfit,
      payroll: payrollMass
    });
  }catch(err){
    res.status(500).json({message:"Erreur dashboard", error:err.message});
  }
});

app.get("/api/users", auth, requireRole("ADMIN"), async (req,res)=>{
  res.json(await all("SELECT id,full_name,username,role,status,created_at FROM users ORDER BY id DESC"));
});
app.post("/api/users", auth, requireRole("ADMIN"), async (req,res)=>{
  try{
    const {full_name,username,password,role} = req.body;
    if(!full_name || !username || !password) return res.status(400).json({message:"Nom, utilisateur et mot de passe obligatoires"});
    const hash = await bcrypt.hash(password, 10);
    await run("INSERT INTO users(full_name,username,password_hash,role,status) VALUES(?,?,?,?,?)", [full_name,username,hash,role||"ADMIN","ACTIVE"]);
    await logAction(req.user.id, "CREATION_UTILISATEUR", username);
    res.json({message:"Utilisateur créé"});
  }catch(err){ res.status(500).json({message:"Erreur création utilisateur", error:err.message});}
});
app.put("/api/users/:id/status", auth, requireRole("ADMIN"), async (req,res)=>{
  await run("UPDATE users SET status=? WHERE id=?", [req.body.status, req.params.id]);
  res.json({message:"Statut modifié"});
});
app.post("/api/users/:id/reset-password", auth, requireRole("SUPER_ADMIN"), async (req,res)=>{
  try {
    const user = await get("SELECT id,username,role FROM users WHERE id=?", [req.params.id]);
    if(!user) return res.status(404).json({message:"Utilisateur introuvable"});
    if(user.role === "SUPER_ADMIN") return res.status(400).json({message:"Le mot de passe du Super Admin ne peut pas être réinitialisé ici"});
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);
    await run("UPDATE users SET password_hash=? WHERE id=?", [passwordHash, user.id]);
    await logAction(req.user.id, "REINITIALISATION_MOT_DE_PASSE", `Utilisateur ${user.username}`);
    res.json({message:"Mot de passe réinitialisé", temporaryPassword});
  } catch(err) { res.status(500).json({message:"Erreur réinitialisation utilisateur", error:err.message}); }
});

app.get("/api/clients", auth, requireRole("ADMIN","CAISSIER","CONSULTATION"), async (req,res)=>{
  res.json(await all("SELECT * FROM clients ORDER BY id DESC"));
});

app.post("/api/clients", auth, requireRole("ADMIN","CAISSIER"), async (req,res)=>{
  try{
    const {code,full_name,piece_type,piece_number,phone,address,account_type,fixed_amount,status,password} = req.body;
    const normalizedCode = String(code || "").trim();
    const normalizedName = String(full_name || "").trim();
    const rawPassword = String(password || "").trim();

    if(!normalizedCode || !normalizedName || !account_type) {
      return res.status(400).json({message:"Code, nom complet et type de compte sont obligatoires"});
    }

    if (!rawPassword) {
      return res.status(400).json({message:"Le mot de passe du client est obligatoire"});
    }

    if (account_type === "CARTE_CLASSIQUE" && (!fixed_amount || Number(fixed_amount) <= 0)) {
      return res.status(400).json({message:"Le montant fixe est obligatoire pour une carte classique"});
    }

    const existing = await get("SELECT id FROM clients WHERE code=?", [normalizedCode]);
    if(existing) return res.status(400).json({message:`Le code ${normalizedCode} existe déjà. Veuillez en utiliser un autre.`});

    const passwordHash = await bcrypt.hash(rawPassword, 10);

    await run(`INSERT INTO clients(code,full_name,piece_type,piece_number,phone,address,account_type,fixed_amount,status,password_hash)
      VALUES(?,?,?,?,?,?,?,?,?,?)`, [
        normalizedCode,
        normalizedName,
        piece_type || null,
        piece_number || null,
        phone || null,
        address || null,
        account_type,
        Number(fixed_amount || 0),
        status || "ACTIVE",
        passwordHash
      ]);
    await logAction(req.user.id, "CREATION_CLIENT", `${normalizedCode} - ${normalizedName}`);
    res.json({message:"Client créé"});
  }catch(err){ res.status(500).json({message:"Erreur création client", error:err.message});}
});

app.put("/api/clients/:id", auth, requireRole("ADMIN","CAISSIER"), async (req,res)=>{
  try{
    const {code,full_name,piece_type,piece_number,phone,address,account_type,fixed_amount,status,password} = req.body;
    const normalizedCode = String(code || "").trim();
    const normalizedName = String(full_name || "").trim();
    const rawPassword = String(password || "").trim();

    if(!normalizedCode || !normalizedName || !account_type) {
      return res.status(400).json({message:"Code, nom complet et type de compte sont obligatoires"});
    }

    if (account_type === "CARTE_CLASSIQUE" && (!fixed_amount || Number(fixed_amount) <= 0)) {
      return res.status(400).json({message:"Le montant fixe est obligatoire pour une carte classique"});
    }

    const existing = await get("SELECT id FROM clients WHERE code=? AND id != ?", [normalizedCode, req.params.id]);
    if(existing) return res.status(400).json({message:`Le code ${normalizedCode} existe déjà. Veuillez en utiliser un autre.`});

    const updateFields = [
      normalizedCode,
      normalizedName,
      piece_type || null,
      piece_number || null,
      phone || null,
      address || null,
      account_type,
      Number(fixed_amount || 0),
      status || "ACTIVE",
      req.params.id
    ];

    let sql = `UPDATE clients SET code=?, full_name=?, piece_type=?, piece_number=?, phone=?, address=?, account_type=?, fixed_amount=?, status=? WHERE id=?`;
    if (rawPassword) {
      const passwordHash = await bcrypt.hash(rawPassword, 10);
      sql = `UPDATE clients SET code=?, full_name=?, piece_type=?, piece_number=?, phone=?, address=?, account_type=?, fixed_amount=?, status=?, password_hash=? WHERE id=?`;
      updateFields.splice(9, 0, passwordHash);
    }

    await run(sql, updateFields);
    await logAction(req.user.id, "MODIFICATION_CLIENT", `${normalizedCode} - ${normalizedName}`);
    res.json({message:"Client modifié"});
  }catch(err){ res.status(500).json({message:"Erreur modification client", error:err.message}); }
});
app.post("/api/clients/:id/reset-password", auth, requireRole("SUPER_ADMIN"), async (req,res)=>{
  try {
    const client = await get("SELECT id,code FROM clients WHERE id=?", [req.params.id]);
    if(!client) return res.status(404).json({message:"Client introuvable"});
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);
    await run("UPDATE clients SET password_hash=? WHERE id=?", [passwordHash, client.id]);
    await logAction(req.user.id, "REINITIALISATION_MOT_DE_PASSE_CLIENT", `Client ${client.code}`);
    res.json({message:"Mot de passe client réinitialisé", temporaryPassword});
  } catch(err) { res.status(500).json({message:"Erreur réinitialisation client", error:err.message}); }
});

app.delete("/api/clients/:id", auth, requireRole("ADMIN"), async (req,res)=>{
  try {
    const client = await get("SELECT id FROM clients WHERE id=?", [req.params.id]);
    if (!client) return res.status(404).json({ message: "Client introuvable" });

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      await connection.execute("DELETE FROM transactions WHERE client_id=?", [req.params.id]);
      await connection.execute("DELETE FROM withdrawal_requests WHERE client_id=?", [req.params.id]);
      await connection.execute("DELETE FROM clients WHERE id=?", [req.params.id]);
      await connection.commit();

      await logAction(req.user.id, "SUPPRESSION_CLIENT", `Client ${req.params.id}`);
      res.json({ message: "Client supprimé" });
    } catch (err) {
      await connection.rollback();

      if (err && err.code === "ER_ROW_IS_REFERENCED_2") {
        return res.status(409).json({
          message: "Impossible de supprimer ce client car il est lié à des opérations ou demandes de retrait."
        });
      }

      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    res.status(500).json({ message: "Erreur suppression client", error: err.message });
  }
});

app.get("/api/clients/:id/summary", auth, requireRole("ADMIN","CAISSIER","CONSULTATION"), async (req,res)=>{
  try{
    const client = await get("SELECT * FROM clients WHERE id=?", [req.params.id]);
    if(!client) return res.status(404).json({message:"Client introuvable"});
    const deposits = await get("SELECT COALESCE(SUM(amount),0) total FROM transactions WHERE client_id=? AND type='DEPOT'", [req.params.id]);
    const withdrawals = await get("SELECT COALESCE(SUM(amount),0) total FROM transactions WHERE client_id=? AND type='RETRAIT'", [req.params.id]);
    const depositCount = await get("SELECT COUNT(*) total FROM transactions WHERE client_id=? AND type='DEPOT'", [req.params.id]);
    const fixed = Number(client.fixed_amount || 0);
    res.json({
      client,
      totalDeposits: deposits.total,
      totalWithdrawals: withdrawals.total,
      balance: deposits.total - withdrawals.total,
      depositCount: depositCount.total,
      expectedTotal: client.account_type==="CARTE_CLASSIQUE" ? fixed*31 : 0,
      companyProfit: client.account_type==="CARTE_CLASSIQUE" ? fixed : 0,
      clientExpectedSaving: client.account_type==="CARTE_CLASSIQUE" ? fixed*30 : 0
    });
  }catch(err){ res.status(500).json({message:"Erreur résumé", error:err.message});}
});

app.post("/api/transactions", auth, requireRole("ADMIN","CAISSIER"), async (req,res)=>{
  try{
    const {client_id,type,amount,reason} = req.body;
    if(!client_id || !type || !amount || Number(amount)<=0) return res.status(400).json({message:"Client, type et montant valide obligatoires"});
    if(type==="RETRAIT" && !reason) return res.status(400).json({message:"Motif obligatoire pour le retrait"});
    const client = await get("SELECT * FROM clients WHERE id=?", [client_id]);
    if(!client) return res.status(404).json({message:"Client introuvable"});
    const deposits = (await get("SELECT COALESCE(SUM(amount),0) total FROM transactions WHERE client_id=? AND type='DEPOT'", [client_id])).total || 0;
    const withdrawals = (await get("SELECT COALESCE(SUM(amount),0) total FROM transactions WHERE client_id=? AND type='RETRAIT'", [client_id])).total || 0;
    if(type==="RETRAIT" && Number(amount) > (Number(deposits)-Number(withdrawals))) return res.status(400).json({message:"Solde client insuffisant"});
    const savedTx = await run("INSERT INTO transactions(client_id,type,amount,reason,created_by) VALUES(?,?,?,?,?)",
      [client_id,type,Number(amount),reason||"",req.user.id]);
    await addOperatingCashMovement(type === "DEPOT" ? "ENTREE" : "SORTIE", Number(amount), `${type} client : ${client.full_name}`, `TX-${savedTx.id}`, req.user.id, "OPERATION_CLIENT");
    await logAction(req.user.id, "OPERATION_CLIENT", `${type} ${amount} client ${client_id}`);
    res.json({message:"Opération enregistrée"});
  }catch(err){ res.status(500).json({message:"Erreur opération", error:err.message});}
});
app.get("/api/clients/:id/history", auth, requireRole("ADMIN","CAISSIER","CONSULTATION"), async (req,res)=>{
  res.json(await all("SELECT * FROM transactions WHERE client_id=? ORDER BY id DESC", [req.params.id]));
});

app.post("/api/withdrawal-requests", auth, requireRole("ADMIN","CAISSIER"), async (req,res)=>{
  try{
    const {client_id,amount,reason} = req.body;
    if(!reason) return res.status(400).json({message:"Motif obligatoire"});
    await run("INSERT INTO withdrawal_requests(client_id,amount,reason) VALUES(?,?,?)", [client_id,Number(amount),reason]);
    res.json({message:"Demande enregistrée. Paiement possible après 24h."});
  }catch(err){ res.status(500).json({message:"Erreur demande", error:err.message});}
});
app.get("/api/withdrawal-requests", auth, requireRole("ADMIN","CAISSIER","CONSULTATION"), async (req,res)=>{
  res.json(await all(`SELECT wr.*, c.code, c.full_name, c.phone FROM withdrawal_requests wr JOIN clients c ON c.id=wr.client_id ORDER BY wr.id DESC`));
});
app.post("/api/withdrawal-requests/:id/validate", auth, requireRole("ADMIN","CAISSIER"), async (req,res)=>{
  try{
    const r = await get("SELECT * FROM withdrawal_requests WHERE id=?", [req.params.id]);
    if(!r) return res.status(404).json({message:"Demande introuvable"});
    if(r.status !== "PENDING") return res.status(400).json({message:"Demande déjà traitée"});

    const requestedAt = parseDateValue(r.requested_at);
    if(!requestedAt) return res.status(400).json({message:"Date de demande invalide"});

    const diff = (Date.now() - requestedAt.getTime()) / 3600000;
    if(diff < 24) return res.status(400).json({message:"La demande n’a pas encore atteint 24h"});
    const deposits = (await get("SELECT COALESCE(SUM(amount),0) total FROM transactions WHERE client_id=? AND type='DEPOT'", [r.client_id])).total || 0;
    const withdrawals = (await get("SELECT COALESCE(SUM(amount),0) total FROM transactions WHERE client_id=? AND type='RETRAIT'", [r.client_id])).total || 0;
    if(Number(r.amount) > (Number(deposits)-Number(withdrawals))) return res.status(400).json({message:"Solde client insuffisant"});
    await run("UPDATE withdrawal_requests SET status='PAID', validated_at=CURRENT_TIMESTAMP WHERE id=?", [req.params.id]);
    const savedTx = await run("INSERT INTO transactions(client_id,type,amount,reason,created_by) VALUES(?,'RETRAIT',?,?,?)", [r.client_id,r.amount,r.reason,req.user.id]);
    const c = await get("SELECT full_name FROM clients WHERE id=?", [r.client_id]);
    await addOperatingCashMovement("SORTIE", Number(r.amount), `Retrait 24h client : ${c ? c.full_name : r.client_id}`, `WDR-${r.id}-TX-${savedTx.id}`, req.user.id, "RETRAIT_24H");
    res.json({message:"Retrait validé et payé"});
  }catch(err){ res.status(500).json({message:"Erreur validation", error:err.message});}
});
app.post("/api/withdrawal-requests/:id/reject", auth, requireRole("ADMIN","CAISSIER"), async (req,res)=>{
  await run("UPDATE withdrawal_requests SET status='REJECTED', validated_at=CURRENT_TIMESTAMP WHERE id=?", [req.params.id]);
  res.json({message:"Demande rejetée"});
});

app.get("/api/employees", auth, requireRole("ADMIN","RH","CONSULTATION"), async (req,res)=>{
  res.json(await all("SELECT * FROM employees ORDER BY id DESC"));
});
app.post("/api/employees", auth, requireRole("ADMIN","RH"), async (req,res)=>{
  try{
    const {code,full_name,phone,email,address,job_title,department,hire_date,base_salary,status} = req.body;
    const cleanCode = normalizeOptionalValue(code);
    const cleanFullName = normalizeOptionalValue(full_name);
    if(!cleanCode || !cleanFullName) return res.status(400).json({message:"Code et nom complet employé obligatoires"});

    const existing = await get("SELECT id FROM employees WHERE code=?", [cleanCode]);
    if(existing) return res.status(400).json({message:`Le code ${cleanCode} existe déjà. Veuillez en utiliser un autre.`});

    const normalizedPhone = normalizeOptionalValue(phone);
    const normalizedEmail = normalizeOptionalValue(email);
    const normalizedAddress = normalizeOptionalValue(address);
    const normalizedJobTitle = normalizeOptionalValue(job_title);
    const normalizedDepartment = normalizeOptionalValue(department);
    const normalizedHireDate = normalizeOptionalValue(hire_date);

    await run(`INSERT INTO employees(code,full_name,phone,email,address,job_title,department,hire_date,base_salary,status)
      VALUES(?,?,?,?,?,?,?,?,?,?)`, [cleanCode, cleanFullName, normalizedPhone, normalizedEmail, normalizedAddress, normalizedJobTitle, normalizedDepartment, normalizedHireDate, Number(base_salary || 0), status || "ACTIVE"]);
    await logAction(req.user.id, "CREATION_EMPLOYE", `${cleanCode} - ${cleanFullName}`);
    res.json({message:"Employé créé"});
  }catch(err){ res.status(500).json({message:"Erreur employé", error:err.message});}
});
app.put("/api/employees/:id", auth, requireRole("ADMIN","RH"), async (req,res)=>{
  try{
    const {code,full_name,phone,email,address,job_title,department,hire_date,base_salary,status} = req.body;
    const cleanCode = normalizeOptionalValue(code);
    const cleanFullName = normalizeOptionalValue(full_name);
    if(!cleanCode || !cleanFullName) return res.status(400).json({message:"Code et nom complet employé obligatoires"});

    const existing = await get("SELECT id FROM employees WHERE code=? AND id != ?", [cleanCode, req.params.id]);
    if(existing) return res.status(400).json({message:`Le code ${cleanCode} existe déjà. Veuillez en utiliser un autre.`});

    const normalizedPhone = normalizeOptionalValue(phone);
    const normalizedEmail = normalizeOptionalValue(email);
    const normalizedAddress = normalizeOptionalValue(address);
    const normalizedJobTitle = normalizeOptionalValue(job_title);
    const normalizedDepartment = normalizeOptionalValue(department);
    const normalizedHireDate = normalizeOptionalValue(hire_date);

    await run(`UPDATE employees SET code=?,full_name=?,phone=?,email=?,address=?,job_title=?,department=?,hire_date=?,base_salary=?,status=? WHERE id=?`,
      [cleanCode, cleanFullName, normalizedPhone, normalizedEmail, normalizedAddress, normalizedJobTitle, normalizedDepartment, normalizedHireDate, Number(base_salary || 0), status || "ACTIVE", req.params.id]);
    await logAction(req.user.id, "MODIFICATION_EMPLOYE", `${cleanCode} - ${cleanFullName}`);
    res.json({message:"Employé modifié"});
  }catch(err){ res.status(500).json({message:"Erreur modification employé", error:err.message}); }
});

app.delete("/api/employees/:id", auth, requireRole("ADMIN","RH"), async (req,res)=>{
  try{
    await run("DELETE FROM payrolls WHERE employee_id=?", [req.params.id]);
    await run("DELETE FROM employees WHERE id=?", [req.params.id]);
    await logAction(req.user.id, "SUPPRESSION_EMPLOYE", "Employé ID " + req.params.id);
    res.json({message:"Employé supprimé"});
  }catch(err){res.status(500).json({message:"Erreur suppression employé", error:err.message});}
});

app.post("/api/payrolls", auth, requireRole("ADMIN","RH"), async (req,res)=>{
  try{
    const {employee_id,month,base_salary,bonus,transport,deductions,advance,cnss,irpp} = req.body;
    if(!employee_id || !month) return res.status(400).json({message:"Employé et mois sont obligatoires"});
    const emp = await get("SELECT * FROM employees WHERE id=?", [employee_id]);
    if(!emp) return res.status(404).json({message:"Employé introuvable"});
    const base = Number(base_salary || emp.base_salary || 0);
    const net = base + Number(bonus||0) + Number(transport||0) - Number(deductions||0) - Number(advance||0) - Number(cnss||0) - Number(irpp||0);
    const cashIn = (await get("SELECT COALESCE(SUM(amount),0) total FROM cash_movements WHERE type='ENTREE'")).total || 0;
    const cashOut = (await get("SELECT COALESCE(SUM(amount),0) total FROM cash_movements WHERE type='SORTIE'")).total || 0;
    const cashBalance = Number(cashIn) - Number(cashOut);
    if(net > cashBalance) return res.status(400).json({message:`Caisse insuffisante. Solde caisse : ${cashBalance} FCFA`});
    const saved = await run(`INSERT INTO payrolls(employee_id,month,base_salary,bonus,transport,deductions,advance,cnss,irpp,net_salary)
      VALUES(?,?,?,?,?,?,?,?,?,?)`, [employee_id,month,base,Number(bonus||0),Number(transport||0),Number(deductions||0),Number(advance||0),Number(cnss||0),Number(irpp||0),net]);
    await run("INSERT INTO cash_movements(type,amount,reason,reference,created_by) VALUES('SORTIE',?,?,?,?)",
      [net, `Paiement salaire : ${emp.full_name} / ${month}`, `PAYROLL-${saved.id}`, req.user.id]);
    await logAction(req.user.id, "PAIEMENT_SALAIRE", `${emp.full_name} - ${net}`);
    res.json({message:"Paie enregistrée et caisse débitée", net_salary:net});
  }catch(err){ res.status(500).json({message:"Erreur paie", error:err.message});}
});
app.get("/api/payrolls", auth, requireRole("ADMIN","RH","CONSULTATION"), async (req,res)=>{
  res.json(await all(`SELECT p.*, e.code, e.full_name, e.job_title FROM payrolls p JOIN employees e ON e.id=p.employee_id ORDER BY p.id DESC`));
});
app.get("/api/payrolls/:id", auth, requireRole("ADMIN","RH","CONSULTATION"), async (req,res)=>{
  const p = await get(`SELECT p.*, e.code, e.full_name, e.phone, e.job_title, e.department FROM payrolls p JOIN employees e ON e.id=p.employee_id WHERE p.id=?`, [req.params.id]);
  if(!p) return res.status(404).json({message:"Bulletin introuvable"});
  res.json(p);
});

app.get("/api/clients/:id/export-csv", auth, requireRole("ADMIN","CAISSIER","CONSULTATION"), async (req,res)=>{
  const client = await get("SELECT * FROM clients WHERE id=?", [req.params.id]);
  const rows = await all("SELECT type,amount,reason,created_at FROM transactions WHERE client_id=? ORDER BY id ASC", [req.params.id]);
  if(!client) return res.status(404).send("Client introuvable");
  let csv = "Client;Code;Type compte;Telephone\n";
  csv += `"${client.full_name}";"${client.code}";"${client.account_type}";"${client.phone||""}"\n\n`;
  csv += "Date;Operation;Montant;Motif\n";
  rows.forEach(r=> csv += `"${r.created_at}";"${r.type}";"${r.amount}";"${r.reason||""}"\n`);
  res.setHeader("Content-Type","text/csv; charset=utf-8");
  res.setHeader("Content-Disposition",`attachment; filename="historique_${client.code}.csv"`);
  res.send("\uFEFF"+csv);
});

app.get("/api/backup/download", async (req, res) => {
  try {
    const [tables] = await pool.query("SHOW TABLES");
    const tableNames = tables.map((row) => Object.values(row)[0]);
    let dump = `-- MySQL dump for ${DB_CONFIG.database}\n`;

    for (const table of tableNames) {
      const [createRows] = await pool.query(`SHOW CREATE TABLE \`${table}\``);
      const createStatement = createRows[0]["Create Table"];
      dump += `\nDROP TABLE IF EXISTS \`${table}\`;\n${createStatement};\n`;

      const [rows] = await pool.query(`SELECT * FROM \`${table}\``);
      if (rows.length > 0) {
        const columns = Object.keys(rows[0]);
        const values = rows.map((row) => {
          const rowValues = columns.map((column) => {
            const value = row[column];
            if (value === null) return "NULL";
            if (typeof value === "number") return String(value);
            return `'${String(value).replace(/'/g, "\\'")}'`;
          });
          return `(${rowValues.join(", ")})`;
        });
        dump += `INSERT INTO \`${table}\` (\`${columns.join("\`, \`")}\`) VALUES ${values.join(", ")};\n`;
      }
    }

    res.setHeader("Content-Type", "application/sql; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${DB_CONFIG.database}_backup.sql"`);
    res.send(dump);
  } catch (err) {
    res.status(500).send("Erreur sauvegarde");
  }
});

app.get("/api/next-code/:type", auth, requireRole("ADMIN","CAISSIER","RH"), async (req,res)=>{
  try{
    const year = new Date().getFullYear();
    let prefix="", count=0;
    if(req.params.type==="client"){prefix="CLI"; count=(await get("SELECT COUNT(*) total FROM clients")).total;}
    else if(req.params.type==="employee"){prefix="EMP"; count=(await get("SELECT COUNT(*) total FROM employees")).total;}
    else if(req.params.type==="deposit"){prefix="DEP"; count=(await get("SELECT COUNT(*) total FROM cash_movements WHERE type='ENTREE'")).total;}
    else if(req.params.type==="opcash"){prefix="CF"; count=(await get("SELECT COUNT(*) total FROM operating_cash_movements")).total;}
    else return res.status(400).json({message:"Type de code invalide"});
    res.json({code:`${prefix}-${year}-${String(Number(count||0)+1).padStart(4,"0")}`});
  }catch(err){res.status(500).json({message:"Erreur génération code", error:err.message});}
});

app.get("/api/cash", auth, requireRole("ADMIN","RH","CONSULTATION"), async (req,res)=>{
  try{
    const totalIn=(await get("SELECT COALESCE(SUM(amount),0) total FROM cash_movements WHERE type='ENTREE'")).total;
    const totalOut=(await get("SELECT COALESCE(SUM(amount),0) total FROM cash_movements WHERE type='SORTIE'")).total;
    const rows=await all("SELECT * FROM cash_movements ORDER BY id DESC");
    res.json({totalIn,totalOut,balance:totalIn-totalOut,rows});
  }catch(err){res.status(500).json({message:"Erreur caisse", error:err.message});}
});

app.post("/api/cash/deposit", auth, requireRole("ADMIN"), async (req,res)=>{
  try{
    const {amount,reason,reference}=req.body;
    if(!amount || Number(amount)<=0) return res.status(400).json({message:"Montant invalide"});
    const saved = await run("INSERT INTO cash_movements(type,amount,reason,reference,created_by) VALUES('ENTREE',?,?,?,?)",
      [Number(amount),reason||"Dépôt caisse",reference||"",req.user.id]);
    const generatedReference = reference || `DEP-${new Date().getFullYear()}-${String(saved.id).padStart(4,"0")}`;
    if (!reference) await run("UPDATE cash_movements SET reference=? WHERE id=?", [generatedReference, saved.id]);
    await logAction(req.user.id,"DEPOT_CAISSE",String(amount));
    res.json({message:"Dépôt en caisse enregistré", reference: generatedReference});
  }catch(err){res.status(500).json({message:"Erreur dépôt caisse", error:err.message});}
});


app.get("/api/operating-cash", auth, requireRole("ADMIN","CAISSIER","CONSULTATION"), async (req,res)=>{
  try{
    const totalIn=(await get("SELECT COALESCE(SUM(amount),0) total FROM operating_cash_movements WHERE type='ENTREE'")).total;
    const totalOut=(await get("SELECT COALESCE(SUM(amount),0) total FROM operating_cash_movements WHERE type='SORTIE'")).total;
    const rows=await all("SELECT * FROM operating_cash_movements ORDER BY id DESC");
    res.json({totalIn,totalOut,balance:totalIn-totalOut,rows});
  }catch(err){res.status(500).json({message:"Erreur caisse de fonctionnement", error:err.message});}
});

app.post("/api/operating-cash/movement", auth, requireRole("ADMIN","CAISSIER"), async (req,res)=>{
  try{
    const {type,amount,reason,reference}=req.body;
    if(!["ENTREE","SORTIE"].includes(type)) return res.status(400).json({message:"Type de mouvement invalide"});
    if(!amount || Number(amount)<=0) return res.status(400).json({message:"Montant invalide"});
    if(type==="SORTIE"){
      const tin=(await get("SELECT COALESCE(SUM(amount),0) total FROM operating_cash_movements WHERE type='ENTREE'")).total || 0;
      const tout=(await get("SELECT COALESCE(SUM(amount),0) total FROM operating_cash_movements WHERE type='SORTIE'")).total || 0;
      if(Number(amount) > Number(tin)-Number(tout)) return res.status(400).json({message:"Caisse de fonctionnement insuffisante"});
    }
    const generatedReference = reference || `CF-${new Date().getFullYear()}-${String((await get("SELECT COALESCE(MAX(id),0) + 1 AS next_id FROM operating_cash_movements")).next_id).padStart(4,"0")}`;
    await addOperatingCashMovement(type, Number(amount), reason || "Mouvement manuel", generatedReference, req.user.id, "MANUEL");
    await logAction(req.user.id,"CAISSE_FONCTIONNEMENT", `${type} ${amount}`);
    res.json({message:"Mouvement de caisse de fonctionnement enregistré", reference: generatedReference});
  }catch(err){res.status(500).json({message:"Erreur mouvement caisse de fonctionnement", error:err.message});}
});

app.get("/api/notifications", auth, requireRole("ADMIN","CAISSIER","RH","CONSULTATION"), async (req,res)=>{
  try{
    const list=[];
    const pending=await all("SELECT wr.*, c.full_name FROM withdrawal_requests wr JOIN clients c ON c.id=wr.client_id WHERE wr.status='PENDING'");
    pending.forEach(r=>{
      const requestedAt = parseDateValue(r.requested_at);
      const diffHours = requestedAt ? (Date.now() - requestedAt.getTime()) / 3600000 : 0;
      const isReady = diffHours >= 24;

      list.push({
        level: isReady ? "success" : "info",
        title: isReady ? "Retrait prêt" : "Retrait en attente",
        message: isReady ? `${r.full_name} a atteint 24h.` : `${r.full_name} : encore ${Math.max(0, Math.ceil(24 - diffHours))}h.`
      });
    });
    res.json(list);
  }catch(err){res.status(500).json({message:"Erreur notifications", error:err.message});}
});

app.get("/api/reports/agents", auth, requireRole("ADMIN","CONSULTATION"), async (req,res)=>{
  try{
    const rows=await all(`SELECT u.id,u.full_name,u.username,u.role,COUNT(t.id) operations,
      COALESCE(SUM(CASE WHEN t.type='DEPOT' THEN t.amount ELSE 0 END),0) deposits,
      COALESCE(SUM(CASE WHEN t.type='RETRAIT' THEN t.amount ELSE 0 END),0) withdrawals
      FROM users u LEFT JOIN transactions t ON t.created_by=u.id GROUP BY u.id ORDER BY operations DESC`);
    res.json(rows);
  }catch(err){res.status(500).json({message:"Erreur statistiques agents", error:err.message});}
});

app.get("/api/audit-logs", auth, requireRole("ADMIN"), async (req,res)=>{
  res.json(await all(`SELECT a.*, u.full_name FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.id DESC LIMIT 200`));
});

initDb().then(()=>{
  app.listen(PORT, HOST, ()=>{
    console.log(`DigitPointage SMART lancé sur http://localhost:${PORT}`);
    console.log("Compte par défaut : admin / admin123");
  });
});