#!/usr/bin/env python3
"""
Script de sincronización automática:
Lee PLANEACION_PROYECTO_WMS360_FORMATEX.xlsx y actualiza PLANEACION_PROYECTO_WMS360_FORMATEX.html
"""
import openpyxl
import json
import re

print("Sincronizando Excel con HTML Dashboard...")
wb = openpyxl.load_workbook("PLANEACION_PROYECTO_WMS360_FORMATEX.xlsx", data_only=True)

# 1. Leer Actividades de la Hoja 02_CRONOGRAMA_GANTT_24SEM
ws_gantt = wb["02_CRONOGRAMA_GANTT_24SEM"]
activities = []
for r in range(4, ws_gantt.max_row + 1):
    act_id = ws_gantt.cell(row=r, column=1).value
    if not act_id or not str(act_id).startswith("ACT-"):
        continue
    
    b_mes = ws_gantt.cell(row=r, column=2).value or ""
    mod = ws_gantt.cell(row=r, column=3).value or ""
    desc = ws_gantt.cell(row=r, column=4).value or ""
    area = ws_gantt.cell(row=r, column=5).value or ""
    resp = ws_gantt.cell(row=r, column=6).value or ""
    w_ini = int(ws_gantt.cell(row=r, column=7).value or 1)
    w_fin = int(ws_gantt.cell(row=r, column=8).value or 1)
    d_ini = str(ws_gantt.cell(row=r, column=9).value or "")
    d_fin = str(ws_gantt.cell(row=r, column=10).value or "")
    st = ws_gantt.cell(row=r, column=11).value or "Planificado"
    deliv = ws_gantt.cell(row=r, column=12).value or ""
    is_hito = ("Hito" in st)
    
    activities.append({
        "id": act_id,
        "mes": b_mes,
        "mod": mod,
        "desc": desc,
        "area": area,
        "resp": resp,
        "wIni": w_ini,
        "wFin": w_fin,
        "dIni": d_ini,
        "dFin": d_fin,
        "st": st,
        "deliv": deliv,
        "isHito": is_hito
    })

print(f"-> {len(activities)} actividades leídas del Excel.")

# 2. Leer Hitos de Pago de la Hoja 01_DASHBOARD_RESUMEN
ws_dash = wb["01_DASHBOARD_RESUMEN"]
payments = []
for r in range(28, 33):
    concepto = ws_dash.cell(row=r, column=1).value
    condicion = ws_dash.cell(row=r, column=2).value
    plazo = ws_dash.cell(row=r, column=3).value
    monto = ws_dash.cell(row=r, column=4).value
    pct = ws_dash.cell(row=r, column=5).value
    if concepto:
        payments.append({
            "concepto": concepto,
            "condicion": condicion,
            "plazo": plazo,
            "monto": f"${monto:,.2f}" if isinstance(monto, (int, float)) else str(monto),
            "pct": f"{pct*100:.1f}%" if isinstance(pct, (int, float)) else str(pct)
        })

print(f"-> {len(payments)} hitos de pago leídos del Excel.")

# 3. Inyectar en HTML
with open("PLANEACION_PROYECTO_WMS360_FORMATEX.html", "r", encoding="utf-8") as f:
    html = f.read()

# Reemplazar array de activities
json_acts = json.dumps(activities, indent=6, ensure_ascii=False)
html = re.sub(
    r"const activities = \[.*?\];",
    f"const activities = {json_acts};",
    html,
    flags=re.DOTALL
)

with open("PLANEACION_PROYECTO_WMS360_FORMATEX.html", "w", encoding="utf-8") as f:
    f.write(html)

print("✅ Sincronización exitosa: PLANEACION_PROYECTO_WMS360_FORMATEX.html actualizado con los cambios del Excel.")
