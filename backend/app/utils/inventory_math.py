"""
Inventory Math — Pure calculation functions.

These functions have NO external dependencies (no DB, no API calls).
Easy to test, easy to replace with ML models in Phase 3.

Formulas:
  SS  = Z × σ_demand × √(lead_time_months)
  ROP = (demand_avg × lead_time_months) + SS
  Qty = max(0, demand_projected_coverage - stock_available + SS)
  stock_available = stock_actual + units_in_transit
"""
import math
from typing import Optional


# Z-scores for common service levels
SERVICE_LEVEL_Z = {
    0.90: 1.28,
    0.95: 1.65,
    0.99: 2.05,
}


def calculate_safety_stock(
    demand_std: float,
    lead_time_months: float,
    z_score: float = 1.65,
) -> float:
    """
    Calculate Safety Stock (SS).
    SS = Z × σ_demand × √(lead_time_months)

    Args:
        demand_std: Standard deviation of monthly demand
        lead_time_months: Lead time in months
        z_score: Z-score for desired service level (default 95% = 1.65)

    Returns:
        Safety stock quantity (rounded up)
    """
    if demand_std <= 0 or lead_time_months <= 0:
        return 0.0
    ss = z_score * demand_std * math.sqrt(lead_time_months)
    return math.ceil(ss)


def calculate_reorder_point(
    demand_avg: float,
    lead_time_months: float,
    safety_stock: float,
) -> float:
    """
    Calculate Reorder Point (ROP).
    ROP = (demand_avg × lead_time_months) + SS

    Args:
        demand_avg: Average monthly demand
        lead_time_months: Lead time in months
        safety_stock: Pre-calculated safety stock

    Returns:
        Reorder point quantity (rounded up)
    """
    if demand_avg <= 0:
        return safety_stock
    rop = (demand_avg * lead_time_months) + safety_stock
    return math.ceil(rop)


def calculate_quantity_to_order(
    demand_avg: float,
    coverage_months: float,
    stock_available: float,
    safety_stock: float,
) -> float:
    """
    Calculate Quantity to Order.
    Qty = max(0, demand_projected_coverage - stock_available + SS)

    Args:
        demand_avg: Average monthly demand
        coverage_months: Target coverage in months (default 6 = 2x lead time)
        stock_available: Current stock + units in transit
        safety_stock: Pre-calculated safety stock

    Returns:
        Quantity to order (rounded up, minimum 0)
    """
    projected = demand_avg * coverage_months
    qty = projected - stock_available + safety_stock
    return max(0, math.ceil(qty))


def calculate_stock_available(
    stock_actual: float,
    units_in_transit: float,
) -> float:
    """
    Calculate available stock.
    stock_available = stock_actual + units_in_transit
    """
    return (stock_actual or 0) + (units_in_transit or 0)


def classify_alert(
    stock_available: float,
    safety_stock: float,
    reorder_point: float,
    months_with_sales: int,
    sin_mov_threshold: int = 6,
) -> str:
    """
    Classify SKU alert status.

    Returns:
        'CRITICO'  → stock_available ≤ SS (order NOW)
        'ALERTA'   → stock_available ≤ ROP (order this week)
        'OK'       → stock_available > ROP (no action)
        'SIN_MOV'  → no sales in last 6 months (review inactivation)
    """
    if months_with_sales <= 0 or months_with_sales < (12 - sin_mov_threshold):
        # If less than 6 months with sales in the last 12, flag as no movement
        # This is a simplified check — in production, check actual last sale date
        pass

    if stock_available <= safety_stock:
        return "CRITICO"
    elif stock_available <= reorder_point:
        return "ALERTA"
    else:
        return "OK"


def calculate_coefficient_of_variation(
    demand_avg: float,
    demand_std: float,
) -> float:
    """
    Calculate Coefficient of Variation (CV).
    CV = σ / μ

    CV interpretation:
      CV < 0.5  → stable demand (moving average works well)
      0.5-1.5   → variable demand (consider weighted average)
      CV > 1.5  → highly variable (needs ML models in Phase 3)
    """
    if demand_avg <= 0:
        return 0.0
    return round(demand_std / demand_avg, 2)


def calculate_demand_stats(monthly_sales: list[float]) -> dict:
    """
    Calculate demand statistics from monthly sales data.

    Args:
        monthly_sales: List of monthly sales quantities (last 12 months)

    Returns:
        Dict with demand_avg, demand_std, cv, months_with_sales
    """
    if not monthly_sales:
        return {
            "demand_avg": 0.0,
            "demand_std": 0.0,
            "cv": 0.0,
            "months_with_sales": 0,
        }

    months_with_sales = sum(1 for s in monthly_sales if s > 0)
    n = len(monthly_sales)

    demand_avg = sum(monthly_sales) / n if n > 0 else 0
    variance = sum((x - demand_avg) ** 2 for x in monthly_sales) / n if n > 0 else 0
    demand_std = math.sqrt(variance)
    cv = calculate_coefficient_of_variation(demand_avg, demand_std)

    return {
        "demand_avg": round(demand_avg, 2),
        "demand_std": round(demand_std, 2),
        "cv": cv,
        "months_with_sales": months_with_sales,
    }


def calculate_full_decision(
    monthly_sales: list[float],
    stock_actual: float,
    units_in_transit: float,
    unit_cost: float,
    lead_time_months: float = 4.0,
    service_level_z: float = 1.65,
    coverage_months: float = 6.0,
) -> dict:
    """
    Calculate the complete supply decision for a single SKU.

    This is the main function that ties everything together.
    Returns all calculated values needed for the decisions table.
    """
    # Step 1: Demand statistics
    stats = calculate_demand_stats(monthly_sales)

    # Step 2: Stock available
    stock_available = calculate_stock_available(stock_actual, units_in_transit)

    # Step 3: Safety Stock
    ss = calculate_safety_stock(stats["demand_std"], lead_time_months, service_level_z)

    # Step 4: Reorder Point
    rop = calculate_reorder_point(stats["demand_avg"], lead_time_months, ss)

    # Step 5: Quantity to order
    qty = calculate_quantity_to_order(stats["demand_avg"], coverage_months, stock_available, ss)

    # Step 6: Alert classification
    alert = classify_alert(stock_available, ss, rop, stats["months_with_sales"])

    # Step 7: Override to SIN_MOV if no recent sales
    if stats["months_with_sales"] < 6:
        alert = "SIN_MOV"

    # Step 8: Estimated order value
    estimated_value = qty * (unit_cost or 0)

    return {
        "stock_actual": stock_actual,
        "units_in_transit": units_in_transit,
        "stock_available": stock_available,
        "demand_avg": stats["demand_avg"],
        "demand_std": stats["demand_std"],
        "cv": stats["cv"],
        "months_with_sales": stats["months_with_sales"],
        "ss": ss,
        "rop": rop,
        "qty_to_order": qty,
        "estimated_value_cop": round(estimated_value, 0),
        "alert_status": alert,
        "parameters": {
            "lead_time_months": lead_time_months,
            "service_level_z": service_level_z,
            "coverage_months": coverage_months,
        },
    }
