"""
AGP Supply System — Development Server
Uses tornado (pre-installed) to serve both API and frontend.
Run: python3 server.py
Then open: http://localhost:3000
"""
import json
import math
import random
import os
import tornado.ioloop
import tornado.web
import tornado.httpserver
import tornado.escape

# ══════════════════════════════════════════════════════════════
# INVENTORY MATH — Pure calculation functions
# ══════════════════════════════════════════════════════════════

def calculate_safety_stock(demand_std, lead_time_months, z_score=1.65):
    if demand_std <= 0 or lead_time_months <= 0:
        return 0.0
    return math.ceil(z_score * demand_std * math.sqrt(lead_time_months))

def calculate_reorder_point(demand_avg, lead_time_months, safety_stock):
    if demand_avg <= 0:
        return safety_stock
    return math.ceil((demand_avg * lead_time_months) + safety_stock)

def calculate_quantity_to_order(demand_avg, coverage_months, stock_available, safety_stock):
    projected = demand_avg * coverage_months
    qty = projected - stock_available + safety_stock
    return max(0, math.ceil(qty))

def calculate_demand_stats(monthly_sales):
    if not monthly_sales:
        return {"demand_avg": 0, "demand_std": 0, "cv": 0, "months_with_sales": 0}
    n = len(monthly_sales)
    months_with_sales = sum(1 for s in monthly_sales if s > 0)
    demand_avg = sum(monthly_sales) / n if n > 0 else 0
    variance = sum((x - demand_avg) ** 2 for x in monthly_sales) / n if n > 0 else 0
    demand_std = math.sqrt(variance)
    cv = round(demand_std / demand_avg, 2) if demand_avg > 0 else 0
    return {
        "demand_avg": round(demand_avg, 2),
        "demand_std": round(demand_std, 2),
        "cv": cv,
        "months_with_sales": months_with_sales,
    }

def calculate_full_decision(monthly_sales, stock_actual, units_in_transit, unit_cost,
                            lead_time_months=4.0, service_level_z=1.65, coverage_months=6.0):
    stats = calculate_demand_stats(monthly_sales)
    stock_available = (stock_actual or 0) + (units_in_transit or 0)
    ss = calculate_safety_stock(stats["demand_std"], lead_time_months, service_level_z)
    rop = calculate_reorder_point(stats["demand_avg"], lead_time_months, ss)
    qty = calculate_quantity_to_order(stats["demand_avg"], coverage_months, stock_available, ss)

    if stats["months_with_sales"] < 6:
        alert = "SIN_MOV"
    elif stock_available <= ss:
        alert = "CRITICO"
    elif stock_available <= rop:
        alert = "ALERTA"
    else:
        alert = "OK"

    return {
        "stock_actual": stock_actual,
        "en_transito": units_in_transit,
        "stock_disponible": stock_available,
        "demand_avg": stats["demand_avg"],
        "demand_std": stats["demand_std"],
        "cv": stats["cv"],
        "months_with_sales": stats["months_with_sales"],
        "ss": ss,
        "rop": rop,
        "qty_to_order": qty,
        "estimated_value": round(qty * (unit_cost or 0)),
        "alert_status": alert,
    }

# ══════════════════════════════════════════════════════════════
# MOCK DATA GENERATION
# ══════════════════════════════════════════════════════════════

REFS = [
    ("ALU-6063-T5-100", "Perfil estructural 100x50mm", "Perfiles", "Estructurales", "A"),
    ("ALU-6061-T6-050", "Ángulo 50x50x3mm", "Perfiles", "Ángulos", "A"),
    ("ALU-6063-T5-075", "Tubo redondo 75mm", "Tubos", "Redondos", "A"),
    ("ALU-6060-T5-040", "Perfil U 40x25mm", "Perfiles", "Canal U", "B"),
    ("ALU-6063-T5-060", "Barra plana 60x3mm", "Barras", "Planas", "B"),
    ("ALU-6005-T5-080", "Tubo cuadrado 80x80mm", "Tubos", "Cuadrados", "B"),
    ("ALU-6063-T5-120", "Perfil H 120x60mm", "Perfiles", "Estructurales", "A"),
    ("ALU-6061-T6-090", "Ángulo desigual 90x60mm", "Perfiles", "Ángulos", "C"),
    ("ALU-6060-T5-030", "Platina 30x3mm", "Barras", "Platinas", "C"),
    ("ALU-6063-T5-045", "Varilla redonda 45mm", "Barras", "Varillas", "C"),
    ("ALU-6005-T5-070", "Tubo rectangular 70x40mm", "Tubos", "Rectangulares", "B"),
    ("ALU-6061-T6-110", "Perfil T 110x60mm", "Perfiles", "Estructurales", "A"),
    ("ALU-6063-T5-055", "Canal 55x35mm", "Perfiles", "Canal U", "B"),
    ("ALU-6060-T5-065", "Riel puerta 65mm", "Accesorios", "Rieles", "C"),
    ("ALU-6063-T5-085", "Marco ventana 85mm", "Sistemas", "Ventanas", "A"),
    ("ALU-6005-T5-095", "Marco puerta 95mm", "Sistemas", "Puertas", "B"),
    ("ALU-6061-T6-035", "Bisagra aluminio 35mm", "Accesorios", "Herrajes", "C"),
    ("ALU-6063-T5-025", "Manija recta 25cm", "Accesorios", "Herrajes", "C"),
    ("ALU-6060-T5-115", "Quicio ventana 115mm", "Sistemas", "Ventanas", "B"),
    ("ALU-6063-T5-105", "Adaptador conexión 105mm", "Accesorios", "Conectores", "C"),
]

def generate_decisions(lt=4.0, z=1.65, cov=6.0):
    random.seed(42)  # Consistent data
    decisions = []
    for i, (ref, desc, cat, subcat, abc) in enumerate(REFS):
        base = random.randint(15, 120) if abc in ("A", "B") else random.randint(0, 25)
        monthly = [max(0, base + random.randint(-25, 25)) for _ in range(12)]
        if abc == "C" and i % 5 == 0:
            monthly = [0]*6 + monthly[6:]
        stock = random.randint(0, 350)
        transit = random.randint(0, 180) if random.random() > 0.35 else 0
        cost = random.randint(5000, 85000)
        r = calculate_full_decision(monthly, stock, transit, cost, lt, z, cov)
        decisions.append({"id": i+1, "reference": ref, "description": desc,
                          "category": cat, "subcategory": subcat, "abc_class": abc,
                          "unit_cost": cost, **r})
    order = {"CRITICO": 0, "ALERTA": 1, "OK": 2, "SIN_MOV": 3}
    decisions.sort(key=lambda d: order.get(d["alert_status"], 4))
    return decisions

# ══════════════════════════════════════════════════════════════
# API HANDLERS
# ══════════════════════════════════════════════════════════════

class BaseHandler(tornado.web.RequestHandler):
    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Origin", "*")
        self.set_header("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
        self.set_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.set_header("Content-Type", "application/json")
    def options(self, *args):
        self.set_status(204)
        self.finish()

class HealthHandler(BaseHandler):
    def get(self):
        self.write({"status": "healthy", "app": "AGP Supply System"})

class DashboardHandler(BaseHandler):
    def get(self):
        decisions = generate_decisions()
        c = sum(1 for d in decisions if d["alert_status"] == "CRITICO")
        a = sum(1 for d in decisions if d["alert_status"] == "ALERTA")
        o = sum(1 for d in decisions if d["alert_status"] == "OK")
        s = sum(1 for d in decisions if d["alert_status"] == "SIN_MOV")
        self.write(json.dumps({
            "total_skus": len(decisions),
            "critical_count": c, "alert_count": a, "ok_count": o, "sin_mov_count": s,
            "total_to_order": sum(1 for d in decisions if d["qty_to_order"] > 0),
            "estimated_total_value": sum(d["estimated_value"] for d in decisions),
            "total_stock_value": sum(d["stock_actual"] * d["unit_cost"] for d in decisions),
            "total_transit_value": sum(d["en_transito"] * d["unit_cost"] for d in decisions),
        }))

class DecisionsHandler(BaseHandler):
    def get(self):
        lt = float(self.get_argument("lead_time", 4.0))
        z = float(self.get_argument("service_level", 1.65))
        cov = float(self.get_argument("coverage", 6.0))
        alert = self.get_argument("alert", None)
        abc = self.get_argument("abc", None)
        search = self.get_argument("search", None)
        decisions = generate_decisions(lt, z, cov)
        if alert:
            decisions = [d for d in decisions if d["alert_status"] == alert]
        if abc:
            decisions = [d for d in decisions if d["abc_class"] == abc]
        if search:
            s = search.lower()
            decisions = [d for d in decisions if s in d["reference"].lower() or s in d["description"].lower()]
        self.write(json.dumps(decisions))

class RecalculateHandler(BaseHandler):
    def post(self):
        body = json.loads(self.request.body) if self.request.body else {}
        lt = body.get("lead_time_months", 4.0)
        z = body.get("service_level_z", 1.65)
        cov = body.get("coverage_months", 6.0)
        decisions = generate_decisions(lt, z, cov)
        self.write(json.dumps({
            "message": "Decisiones recalculadas exitosamente",
            "total": len(decisions),
            "parameters": {"lead_time_months": lt, "service_level_z": z, "coverage_months": cov}
        }))

class ParametersHandler(BaseHandler):
    def get(self):
        self.write(json.dumps({"lead_time_months": 4.0, "service_level_z": 1.65, "coverage_months": 6.0}))
    def put(self):
        body = json.loads(self.request.body) if self.request.body else {}
        self.write(json.dumps({"message": "Parametros actualizados", **body}))

class UploadHandler(tornado.web.RequestHandler):
    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Origin", "*")
        self.set_header("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
        self.set_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.set_header("Content-Type", "application/json")
    def options(self, *args):
        self.set_status(204)
        self.finish()
    def post(self):
        if not self.request.files:
            self.set_status(400)
            self.write(json.dumps({"detail": "No se envio ningun archivo"}))
            return
        file_info = list(self.request.files.values())[0][0]
        filename = file_info["filename"]
        self.write(json.dumps({
            "message": f"Archivo '{filename}' procesado exitosamente",
            "filename": filename,
            "rows_processed": random.randint(200, 1500),
            "type": "auto_detected"
        }))

class ExportHandler(BaseHandler):
    def get(self):
        self.write(json.dumps({"message": "Export generado", "url": "/exports/lista_compra.xlsx"}))

# ══════════════════════════════════════════════════════════════
# FRONTEND — Self-contained HTML
# ══════════════════════════════════════════════════════════════

class FrontendHandler(tornado.web.RequestHandler):
    def get(self, path=""):
        self.set_header("Content-Type", "text/html")
        html_path = os.path.join(os.path.dirname(__file__), "index.html")
        with open(html_path, "r") as f:
            self.write(f.read())

# ══════════════════════════════════════════════════════════════
# APP SETUP
# ══════════════════════════════════════════════════════════════

def make_app():
    return tornado.web.Application([
        (r"/api/health", HealthHandler),
        (r"/api/supply/dashboard", DashboardHandler),
        (r"/api/supply/decisions", DecisionsHandler),
        (r"/api/supply/recalculate", RecalculateHandler),
        (r"/api/supply/parameters", ParametersHandler),
        (r"/api/supply/export/excel", ExportHandler),
        (r"/api/imports/upload", UploadHandler),
        (r"/(.*)", FrontendHandler),
    ], debug=True, default_handler_class=FrontendHandler)

if __name__ == "__main__":
    try:
        app = make_app()
        server = tornado.httpserver.HTTPServer(app, max_buffer_size=50*1024*1024)
        server.listen(3000, address="0.0.0.0")
        print("=" * 60)
        print("  AGP Sistema de Abastecimiento")
        print("  Server running at http://localhost:3000")
        print("  API docs at http://localhost:3000/api/health")
        print("=" * 60)
        tornado.ioloop.IOLoop.current().start()
    except Exception as e:
        print(f"ERROR starting server: {e}")
        import traceback
        traceback.print_exc()
