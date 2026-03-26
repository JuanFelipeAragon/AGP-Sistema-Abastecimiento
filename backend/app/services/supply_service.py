"""
Supply Service — Business logic for abastecimiento module.

Orchestrates inventory_math calculations with data from Supabase.
Calls pure functions from utils/inventory_math.py — the math layer
is swappable without touching this service or the endpoints.
"""
import random
from app.utils.inventory_math import calculate_full_decision
from app.models.supply import (
    SupplyDashboardResponse,
    SupplyDecisionResponse,
    AlertStatus,
)


def _generate_mock_decisions(
    lead_time_months: float = 4.0,
    service_level_z: float = 1.65,
    coverage_months: float = 6.0,
) -> list[dict]:
    """
    Generate mock supply decisions for development.
    TODO: Replace with actual Supabase queries in production.
    """
    refs = [
        ("ALU-6063-T5-100", "Perfil estructural 100x50", "Perfiles", "Estructurales", "A"),
        ("ALU-6061-T6-050", "Ángulo 50x50x3mm", "Perfiles", "Ángulos", "A"),
        ("ALU-6063-T5-075", "Tubo redondo 75mm", "Tubos", "Redondos", "A"),
        ("ALU-6060-T5-040", "Perfil U 40x25", "Perfiles", "Canal U", "B"),
        ("ALU-6063-T5-060", "Barra plana 60x3", "Barras", "Planas", "B"),
        ("ALU-6005-T5-080", "Tubo cuadrado 80x80", "Tubos", "Cuadrados", "B"),
        ("ALU-6063-T5-120", "Perfil H 120x60", "Perfiles", "Estructurales", "A"),
        ("ALU-6061-T6-090", "Ángulo desigual 90x60", "Perfiles", "Ángulos", "C"),
        ("ALU-6060-T5-030", "Platina 30x3", "Barras", "Platinas", "C"),
        ("ALU-6063-T5-045", "Varilla redonda 45mm", "Barras", "Varillas", "C"),
        ("ALU-6005-T5-070", "Tubo rectangular 70x40", "Tubos", "Rectangulares", "B"),
        ("ALU-6061-T6-110", "Perfil T 110x60", "Perfiles", "Estructurales", "A"),
        ("ALU-6063-T5-055", "Canal 55x35", "Perfiles", "Canal U", "B"),
        ("ALU-6060-T5-065", "Riel 65mm", "Accesorios", "Rieles", "C"),
        ("ALU-6063-T5-085", "Marco ventana 85", "Sistemas", "Ventanas", "A"),
        ("ALU-6005-T5-095", "Marco puerta 95", "Sistemas", "Puertas", "B"),
        ("ALU-6061-T6-035", "Bisagra aluminio", "Accesorios", "Herrajes", "C"),
        ("ALU-6063-T5-025", "Manija recta", "Accesorios", "Herrajes", "C"),
        ("ALU-6060-T5-115", "Quicio 115mm", "Sistemas", "Ventanas", "B"),
        ("ALU-6063-T5-105", "Adaptador 105mm", "Accesorios", "Conectores", "C"),
    ]

    decisions = []
    for i, (ref, desc, cat, subcat, abc) in enumerate(refs):
        # Generate realistic monthly sales
        base_demand = random.randint(5, 100) if abc in ("A", "B") else random.randint(0, 20)
        monthly_sales = [max(0, base_demand + random.randint(-20, 20)) for _ in range(12)]

        # Some SKUs have no recent movement
        if i % 7 == 0 and abc == "C":
            monthly_sales = [0] * 6 + monthly_sales[6:]

        stock_actual = random.randint(0, 300)
        units_in_transit = random.randint(0, 150) if random.random() > 0.4 else 0
        unit_cost = random.randint(5000, 80000)

        result = calculate_full_decision(
            monthly_sales=monthly_sales,
            stock_actual=stock_actual,
            units_in_transit=units_in_transit,
            unit_cost=unit_cost,
            lead_time_months=lead_time_months,
            service_level_z=service_level_z,
            coverage_months=coverage_months,
        )

        decisions.append({
            "id": i + 1,
            "reference": ref,
            "description": desc,
            "category": cat,
            "subcategory": subcat,
            "abc_class": abc,
            "unit_cost": unit_cost,
            **result,
            "en_transito": units_in_transit,
            "stock_disponible": result["stock_available"],
        })

    # Sort: CRITICO first, then ALERTA, OK, SIN_MOV
    order = {"CRITICO": 0, "ALERTA": 1, "OK": 2, "SIN_MOV": 3}
    decisions.sort(key=lambda d: order.get(d["alert_status"], 4))

    return decisions


async def get_dashboard_summary(
    lead_time_months: float = 4.0,
    service_level_z: float = 1.65,
    coverage_months: float = 6.0,
) -> SupplyDashboardResponse:
    """Get executive dashboard summary."""
    decisions = _generate_mock_decisions(lead_time_months, service_level_z, coverage_months)

    critical = sum(1 for d in decisions if d["alert_status"] == "CRITICO")
    alert = sum(1 for d in decisions if d["alert_status"] == "ALERTA")
    ok = sum(1 for d in decisions if d["alert_status"] == "OK")
    sin_mov = sum(1 for d in decisions if d["alert_status"] == "SIN_MOV")
    to_order = sum(1 for d in decisions if d["qty_to_order"] > 0)
    total_value = sum(d["estimated_value_cop"] for d in decisions)
    stock_value = sum(d["stock_actual"] * d["unit_cost"] for d in decisions)
    transit_value = sum(d["en_transito"] * d["unit_cost"] for d in decisions)

    return SupplyDashboardResponse(
        total_skus=len(decisions),
        critical_count=critical,
        alert_count=alert,
        ok_count=ok,
        sin_mov_count=sin_mov,
        total_to_order=to_order,
        estimated_total_value=total_value,
        total_stock_value=stock_value,
        total_transit_value=transit_value,
    )


async def get_decisions(
    alert_status: str = None,
    abc_class: str = None,
    search: str = None,
    lead_time_months: float = 4.0,
    service_level_z: float = 1.65,
    coverage_months: float = 6.0,
) -> list[dict]:
    """Get filtered supply decisions."""
    decisions = _generate_mock_decisions(lead_time_months, service_level_z, coverage_months)

    if alert_status:
        decisions = [d for d in decisions if d["alert_status"] == alert_status]
    if abc_class:
        decisions = [d for d in decisions if d["abc_class"] == abc_class]
    if search:
        s = search.lower()
        decisions = [d for d in decisions if s in d["reference"].lower() or s in d["description"].lower()]

    return decisions


async def recalculate(
    lead_time_months: float = 4.0,
    service_level_z: float = 1.65,
    coverage_months: float = 6.0,
) -> dict:
    """Recalculate all decisions with new parameters."""
    decisions = _generate_mock_decisions(lead_time_months, service_level_z, coverage_months)
    return {
        "message": "Decisiones recalculadas exitosamente",
        "total_decisions": len(decisions),
        "parameters": {
            "lead_time_months": lead_time_months,
            "service_level_z": service_level_z,
            "coverage_months": coverage_months,
        },
    }
