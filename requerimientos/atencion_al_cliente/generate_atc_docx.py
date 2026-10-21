import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def create_element(name):
    return OxmlElement(name)

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=120, bottom=120, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def generate_atc_docx():
    doc = docx.Document()

    # Set page margins (1 inch)
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.9)
        section.right_margin = Inches(0.9)

    # Styles
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Calibri'
    normal_style.font.size = Pt(10.5)
    normal_style.font.color.rgb = RGBColor(0x33, 0x41, 0x55) # Slate 700

    # Colors
    NAVY = RGBColor(0x0f, 0x17, 0x2a) # Slate 900
    INDIGO = RGBColor(0x37, 0x30, 0xa3) # Indigo 800
    GRAY_TEXT = RGBColor(0x64, 0x74, 0x8b) # Slate 500

    # Document Header / Pre-title
    p_pre = doc.add_paragraph()
    p_pre.paragraph_format.space_after = Pt(2)
    run_pre = p_pre.add_run("FORMATEX WMS 360° · ESPECIFICACIÓN DE REGLAS DE NEGOCIO Y OPERACIÓN")
    run_pre.font.size = Pt(9)
    run_pre.font.bold = True
    run_pre.font.color.rgb = INDIGO

    # Title
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(4)
    p_title.paragraph_format.space_after = Pt(2)
    run_title = p_title.add_run("Módulo de Atención al Cliente (ATC), Ventas & Conexión Logística")
    run_title.font.size = Pt(20)
    run_title.font.bold = True
    run_title.font.color.rgb = NAVY

    # Subtitle / Version Badge
    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_after = Pt(14)
    run_sub = p_sub.add_run("Versión 1.1 Oficial Consolidada · Revisión Integral Sesión #2 (21 de Octubre de 2026)")
    run_sub.font.size = Pt(11)
    run_sub.font.italic = True
    run_sub.font.color.rgb = GRAY_TEXT

    # Metadata Table Box
    meta_table = doc.add_table(rows=5, cols=2)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_table.autofit = False

    data_meta = [
        ("Organización Solicitante:", "Forma Textil S. de R.L. de C.V. (Formatex)"),
        ("Socio Tecnológico:", "Movida TCI LLC"),
        ("Fechas de Levantamiento:", "Sesión #1: 14/Oct/2026 | Sesión #2: 21/Oct/2026"),
        ("Participantes de Formatex:", "Alma (Jefa ATC), Andrea Ramírez (ATC/Operaciones), Santiago (Comercial), Nayeli (ATC Web)"),
        ("Participantes de Movida TCI:", "Ricardo Zerpa (Arquitectura de Procesos), Jonathan Palacios (Dirección Técnica)")
    ]

    for idx, (lbl, val) in enumerate(data_meta):
        row = meta_table.rows[idx]
        cell_lbl, cell_val = row.cells[0], row.cells[1]
        cell_lbl.width = Inches(2.2)
        cell_val.width = Inches(4.5)
        set_cell_background(cell_lbl, "F1F5F9")
        set_cell_background(cell_val, "F8FAFC")
        set_cell_margins(cell_lbl, 80, 80, 100, 100)
        set_cell_margins(cell_val, 80, 80, 100, 100)

        p0 = cell_lbl.paragraphs[0]
        p0.paragraph_format.space_after = Pt(1)
        r0 = p0.add_run(lbl)
        r0.font.bold = True
        r0.font.size = Pt(9.5)
        r0.font.color.rgb = NAVY

        p1 = cell_val.paragraphs[0]
        p1.paragraph_format.space_after = Pt(1)
        r1 = p1.add_run(val)
        r1.font.size = Pt(9.5)
        r1.font.color.rgb = RGBColor(0x1e, 0x29, 0x3b)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # Helper function for adding Headings
    def add_h1(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(16)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.size = Pt(14)
        run.font.bold = True
        run.font.color.rgb = INDIGO
        return p

    def add_h2(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.size = Pt(12)
        run.font.bold = True
        run.font.color.rgb = NAVY
        return p

    def add_bullet(bold_prefix, text):
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_before = Pt(1)
        p.paragraph_format.space_after = Pt(3)
        r_pre = p.add_run(bold_prefix)
        r_pre.font.bold = True
        r_pre.font.color.rgb = NAVY
        p.add_run(text)
        return p

    def add_callout(text, title="NOTA OPERATIVA VINCULANTE:"):
        table = doc.add_table(rows=1, cols=1)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = table.cell(0, 0)
        cell.width = Inches(6.7)
        set_cell_background(cell, "EFF6FF") # Light blue
        set_cell_margins(cell, 100, 100, 140, 140)
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(2)
        r_title = p.add_run(f"{title} ")
        r_title.font.bold = True
        r_title.font.size = Pt(9.5)
        r_title.font.color.rgb = INDIGO
        r_text = p.add_run(text)
        r_text.font.size = Pt(9.5)
        r_text.font.color.rgb = RGBColor(0x1e, 0x3a, 0x8a)
        doc.add_paragraph().paragraph_format.space_after = Pt(4)

    # 1. Propósito
    add_h1("1. Propósito y Marco de Aceptación Vinculante")
    p = doc.add_paragraph(
        "El presente documento recopila y formaliza de manera transparente y exhaustiva todas las reglas de negocio, "
        "candados de seguridad operativa y flujos de trabajo consensuados durante las sesiones operativas del 14 y 21 "
        "de octubre de 2026 entre el equipo de Atención al Cliente (ATC) de Formatex y Movida TCI."
    )
    add_callout(
        "Este documento actúa como anexo técnico vinculante. Su propósito es dejar por escrito el alcance, las excepciones "
        "y los criterios de aceptación para que ambas partes cuenten con un estándar único y homologado, evitando discrepancias "
        "futuras y garantizando que el WMS 360° responda exactamente a las necesidades operativas de Formatex.",
        "FINALIDAD OPERATIVA Y CONTRACTUAL:"
    )

    # 2. Regla 1
    add_h1("2. Regla de Negocio 1: Registro y Perfilado Integral de Clientes")
    add_h2("2.1. Origen y Responsabilidad del Alta")
    add_bullet("Canal Comercial: ", "Los agentes comerciales foráneos y locales ('callejeros') recopilan y envían la documentación de los prospectos por correo o mensajería.")
    add_bullet("Facultad Exclusiva: ", "El personal de Atención al Cliente (ATC) es el único facultado para registrar el alta formal del cliente en el sistema.")

    add_h2("2.2. Expediente Digital Obligatorio del Cliente")
    doc.add_paragraph("Para autorizar cotizaciones de mayoreo o líneas de crédito, ATC captura y valida:")
    add_bullet("Razón Social y RFC: ", "Validado contra la Constancia de Situación Fiscal (CSF) emitida por el SAT.")
    add_bullet("Domicilio Fiscal Matriz: ", "Calle, Número exterior/interior, Colonia, Municipio, Estado, Código Postal.")
    add_bullet("Carta de Fletera Oficial: ", "Firmada por el cliente, donde ratifica la empresa de transporte de su preferencia y si contrata o declina el seguro de carga ante siniestros.")
    add_bullet("Datos de Contacto Clave: ", "Nombre, teléfono celular directo y correo para envío automático de facturas CFDI 4.0.")

    add_h2("2.3. Estructura Multi-Domicilio (Destinos Alternos de Entrega)")
    doc.add_paragraph(
        "Un mismo cliente fiscal suele despachar a múltiples destinos físicos (sucursales, bodegas regionales o talleres de tapicería externos). "
        "El WMS permite registrar N domicilios de entrega por cliente, guardando alias, dirección completa, receptor, teléfono y horarios permitidos."
    )

    # 3. Regla 2
    add_h1("3. Regla de Negocio 2: Las 10 Listas de Precios Oficiales y Candados de Modificación")
    doc.add_paragraph(
        "El WMS descarta cualquier nomenclatura genérica y adopta el catálogo oficial proporcionado por la jefatura de ATC. "
        "Las listas F3, F5, F7 y F9 cuentan con candados gerenciales estrictos que exigen aprobación previa de Dirección para ser asignadas:"
    )

    # Table of 10 price lists
    pl_table = doc.add_table(rows=11, cols=4)
    pl_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    pl_table.autofit = False

    headers = ["Lista", "Nombre de la Lista", "Perfil Comercial Objetivo", "Candado de Autorización"]
    for i, h in enumerate(headers):
        cell = pl_table.rows[0].cells[i]
        set_cell_background(cell, "1E293B")
        set_cell_margins(cell, 80, 80, 100, 100)
        p = cell.paragraphs[0]
        r = p.add_run(h)
        r.font.bold = True
        r.font.size = Pt(9)
        r.font.color.rgb = RGBColor(0xff, 0xff, 0xff)

    pl_data = [
        ("F1", "Casa Decoradora", "Estudios de interiorismo, diseñadores y decoradores", "Asignación Estándar (Sin aprobación)"),
        ("F2", "Tienda Especial", "Tiendas de retail textil, tapicerías medianas y talleres de diseño", "Asignación Estándar (Sin aprobación)"),
        ("F3", "Fabricante", "Plantas fabricantes de muebles y salas en volumen intermedio", "REQUIERE AUTORIZACIÓN GERENCIAL 🔒"),
        ("F4", "Distribuidor", "Comercializadoras mayoristas y distribuidores regionales", "Asignación Estándar (Sin aprobación)"),
        ("F5", "Distribuidor Especial", "Distribuidores de alto desplazamiento con condiciones negociadas", "REQUIERE AUTORIZACIÓN GERENCIAL 🔒"),
        ("F6", "Medio Mayorista", "Talleres industriales y tapicerías de consumo continuo", "Asignación Estándar (Sin aprobación)"),
        ("F7", "Gran Mayorista", "Cuentas corporativas de escala nacional (ej. Plasencia)", "REQUIERE AUTORIZACIÓN GERENCIAL 🔒"),
        ("F8", "Comprador de Rollo", "Clientes de menudeo o medio mayoreo que compran rollos cerrados", "Asignación Estándar (Sin aprobación)"),
        ("F9", "Mega Mayorista", "Cuentas estratégicas de máximo volumen de compra", "REQUIERE APROBACIÓN DIRECCIÓN GENERAL 🔒"),
        ("F10", "Venta Web / Catálogo Especial", "Compradores en línea vía portal web / Shopify", "Asignación Automática Sistema")
    ]

    for idx, row_vals in enumerate(pl_data):
        row = pl_table.rows[idx + 1]
        for col_idx, val in enumerate(row_vals):
            cell = row.cells[col_idx]
            bg = "F8FAFC" if idx % 2 == 0 else "FFFFFF"
            if "REQUIERE" in val:
                bg = "FEF3C7" # light amber
            set_cell_background(cell, bg)
            set_cell_margins(cell, 60, 60, 80, 80)
            p = cell.paragraphs[0]
            r = p.add_run(val)
            r.font.size = Pt(8.5)
            if col_idx == 0:
                r.font.bold = True
            if "REQUIERE" in val:
                r.font.bold = True
                r.font.color.rgb = RGBColor(0x92, 0x40, 0x0e)

    # 4. Regla 3
    add_h1("4. Regla de Negocio 3: Matriz de Precios Especiales por Cliente y SKU")
    add_bullet("Acuerdos Directivos: ", "Ciertos clientes cuentan con precios pactados por metro para telas específicas mediante acuerdos comerciales de Dirección General.")
    add_bullet("Prioridad Absoluta: ", "Si existe un precio especial registrado, el sistema bloquea y anula cualquier lista base, aplicando automáticamente el precio pactado.")
    add_bullet("Candado de Integridad: ", "Los precios especiales están precargados y bloqueados en pantalla para evitar alteraciones manuales que provoquen pérdidas comerciales.")

    # 5. Regla 4 & 5
    add_h1("5. Regla de Negocio 4 y 5: Tarifario Diferenciado Rollo vs. Corte y Ventana de Apartado")
    add_bullet("Diferencial Rollo vs. Corte: ", "La compra por corte implica una tarifa superior al rollo completo debido al costo operativo de desenrollado, mesa de corte y mermas.")
    add_bullet("Ventana de Apartado Comercial (24 Horas): ", "El apartado preventivo reservado por un cliente vence automáticamente a las 24 horas si no presenta comprobante de pago o confirmación de crédito.")
    add_bullet("Apartado Operativo en Almacén (72 Horas): ", "Los pedidos empacados y listos en piso de almacén cuentan con un resguardo máximo de 72 horas antes de liberarse a stock disponible.")

    # 6. Regla 6 & 7
    add_h1("6. Regla de Negocio 6 y 7: Validación Logística y Motor de Backorders FIFO Marítimo")
    add_bullet("Tarea Preventiva en EN_SURTIDO: ", "Al pasar a EN_SURTIDO, el sistema asigna tarea automática a ATC para revalidar domicilio, receptor, teléfono directo y fletera antes del embalaje.")
    add_bullet("Backorders Marítimos (FIFO): ", "Pedidos sobre rollos en tránsito marítimo asignan número de contenedor, fecha y orden FIFO estricto.")
    add_bullet("Semáforos Preventivos: ", "Alerta a 15 días (revalidar OC) y a 5 días (preparar liquidación, CFDI 4.0 y patio de corte). Desistimientos recorren la cola automáticamente en cascada.")

    # 7. Reglas Sesion 2
    add_h1("7. Reglas de Negocio Derivadas de la Sesión #2 (21 de Octubre de 2026)")
    
    add_h2("7.1. Regla 8: Matriz de Días y Horarios de Entrega por Cliente & Retención en Bodega")
    p = doc.add_paragraph(
        "Los clientes de mayoreo y talleres externos reciben mercancía únicamente en días fijos acordados (ej. Martes y Jueves) "
        "y en ventanas horarias específicas (ej. 09:00 a 14:00 hrs). El sistema incorpora selectores de días permitidos "
        "([Lun] [Mar] [Mié] [Jue] [Vie] [Sáb]) y horarios de recepción en el catálogo de clientes."
    )
    add_callout(
        "Si un pedido concluye su corte, empaque y facturación un día que no coincide con los días autorizados de recepción del cliente, "
        "el WMS PROHÍBE subir el bulto a ruta. El pedido permanece retenido físicamente en estado 'Bodega en Espera de Ruta' "
        "hasta la mañana del día autorizado, evitando fletes falsos y rechazos en rampa.",
        "CANDADO DE RETENCIÓN FÍSICA EN BODEGA:"
    )

    add_h2("7.2. Regla 9: Flota Propia de Formatex (8 Camionetas) y Rutas Programadas (Drive In)")
    add_bullet("Flota Vehicular: ", "Formatex opera 8 camionetas propias para reparto metropolitano y regional, gestionadas en Drive In por Carla (Jefatura de Embarques).")
    add_bullet("Ruta Ocotlán (Martes y Jueves): ", "Ruta fija fuera de Guadalajara que opera exclusivamente los días Martes y Jueves. Pedidos concluidos el lunes tarde ya no alcanzan la logística del martes y se entregan obligatoriamente el jueves.")
    add_bullet("Sincronización ATC: ", "ATC se guía por el semáforo de rutas programadas para no prometer fechas de entrega incompatibles con la logística de reparto.")

    add_h2("7.3. Regla 10: Canal E-Commerce Web (Shopify / Nayeli / Lista F10)")
    add_bullet("Operación Minorista: ", "Ventas en una sola exhibición sin crédito mercantil, gestionadas por Nayeli vía Shopify.")
    add_bullet("Lista F10: ", "Liquidación bajo lista oficial F10. Confirmado el pago bancario, se canaliza al almacén para surtido inmediato.")
    add_bullet("Envíos: ", "Nacionales con guías prepagadas; envíos internacionales excepcionales (ej. Colombia / Medellín) requieren cotización directa de flete con Luis Javier.")

    add_h2("7.4. Regla 11: Tratamiento de Muestras como Producto Terminado por Pieza (PZA)")
    add_bullet("Unidad de Medida PZA: ", "Los muestrarios, carpetas de colección y libros de telas son productos terminados registrados en unidades/piezas.")
    add_bullet("Sin Proceso de Corte: ", "No generan mermas ni requieren cálculo de corte en rollos. El precio se liquida unitariamente por pieza ($/PZA).")

    add_h2("7.5. Regla 12: Traspasos Inter-Compañía Digitales Telares y Tejidos (TNT) ↔ Formatex")
    p = doc.add_paragraph(
        "Telares y Tejidos (TNT) y Formatex pertenecen al mismo propietario ('se pagan y se dan el vuelto'). Telares opera como importadora "
        "y custodia de inventario en bodegas cercanas (Río Tototlán / Rensselaer). El traspaso diario de rollos sustituye el flujo informal "
        "de capturas de WhatsApp por un Módulo de Solicitud Digital de Traspaso con folio oficial y bitácora de auditoría completa."
    )

    add_h2("7.6. Regla 13: Bloqueo Estricto de Precios Especiales y Listas Asignadas")
    add_callout(
        "Se prohíbe la modificación manual del precio unitario por parte de los agentes comerciales al capturar pedidos. "
        "Los precios quedan estrictamente bloqueados según la lista oficial asignada o el convenio de precio especial directivo, "
        "blindando a Formatex contra errores operativos y pérdidas comerciales involuntarias.",
        "CANDADO DE INTEGRIDAD COMERCIAL:"
    )

    # 8. Matriz de Compromisos
    add_h1("8. Matriz de Compromisos y Entregables Actualizada")
    check_table = doc.add_table(rows=9, cols=3)
    check_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    check_table.autofit = False

    ch_headers = ["Responsable", "Entregable / Acción Acordada", "Estatus"]
    for i, h in enumerate(ch_headers):
        cell = check_table.rows[0].cells[i]
        set_cell_background(cell, "1E293B")
        set_cell_margins(cell, 80, 80, 100, 100)
        p = cell.paragraphs[0]
        r = p.add_run(h)
        r.font.bold = True
        r.font.size = Pt(9)
        r.font.color.rgb = RGBColor(0xff, 0xff, 0xff)

    ch_data = [
        ("Andrea Ramírez / Alma", "Compartir catálogo detallado de las 10 listas de precios vigentes", "COMPLETADO (12,386 precios ingeridos)"),
        ("Andrea Ramírez", "Compartir archivo Excel de Precios Especiales autorizados por Dirección", "COMPLETADO (306 convenios ingeridos)"),
        ("Andrea Ramírez", "Enviar paquete documental de clientes: CSF muestra, Carta de fleteras", "Pendiente envío"),
        ("Formatex / Carla", "Sesión de levantamiento de Embarques y plataforma Drive In", "Programada para semana siguiente"),
        ("Formatex / Israel", "Sesiones de levantamiento de Almacén y recepción de Telares (1 y 2)", "Programada Viernes 23 de Octubre"),
        ("Formatex / Nayeli", "Validación de variantes Shopify y envíos internacionales", "Por agendar breve llamada"),
        ("Movida TCI", "Entrega de documento oficial v1.1 consolidado con Sesión #2 para firma", "COMPLETADO"),
        ("Movida TCI", "Implementación de selector de días de ruta, bloqueo de precios y muestras", "COMPLETADO en frontend v1.4.1")
    ]

    for idx, (resp, act, st) in enumerate(ch_data):
        row = check_table.rows[idx + 1]
        for col_idx, text in enumerate([resp, act, st]):
            cell = row.cells[col_idx]
            bg = "F8FAFC" if idx % 2 == 0 else "FFFFFF"
            if "COMPLETADO" in text:
                bg = "DCFCE7" # light green
            set_cell_background(cell, bg)
            set_cell_margins(cell, 60, 60, 80, 80)
            p = cell.paragraphs[0]
            r = p.add_run(text)
            r.font.size = Pt(8.5)
            if col_idx == 0:
                r.font.bold = True
            if "COMPLETADO" in text:
                r.font.bold = True
                r.font.color.rgb = RGBColor(0x16, 0x65, 0x34)

    # 9. Firmas de Conformidad
    add_h1("9. Formalización y Firmas de Conformidad")
    doc.add_paragraph(
        "Al firmar el presente documento, las partes manifiestan su plena conformidad con los requerimientos, candados de seguridad "
        "operativa y reglas de negocio aquí descritas, reconociéndolas como el marco oficial y vinculante de desarrollo y aceptación "
        "para el módulo de Atención al Cliente (ATC), Ventas y Conexión Logística del WMS 360+ Formatex:"
    )

    doc.add_paragraph().paragraph_format.space_after = Pt(20)

    # Signatures table
    sig_table = doc.add_table(rows=2, cols=2)
    sig_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    sig_table.autofit = False

    sigs = [
        ("Alma", "Jefatura de Atención al Cliente\nForma Textil S. de R.L. de C.V.\nFecha: _____ / _____ / 2026"),
        ("Andrea Ramírez", "Atención al Cliente & Operaciones\nForma Textil S. de R.L. de C.V.\nFecha: _____ / _____ / 2026"),
        ("Ricardo Zerpa", "Arquitectura de Producto & Procesos\nMovida TCI LLC\nFecha: _____ / _____ / 2026"),
        ("Jonathan Palacios", "Dirección Técnica & Desarrollo WMS\nMovida TCI LLC\nFecha: _____ / _____ / 2026")
    ]

    for idx, (name, role) in enumerate(sigs):
        r_idx = idx // 2
        c_idx = idx % 2
        cell = sig_table.rows[r_idx].cells[c_idx]
        cell.width = Inches(3.3)
        set_cell_margins(cell, 100, 100, 80, 80)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(2)
        r_line = p.add_run("_________________________________________\n")
        r_line.font.bold = True
        r_name = p.add_run(f"{name}\n")
        r_name.font.bold = True
        r_name.font.size = Pt(10)
        r_name.font.color.rgb = NAVY
        r_role = p.add_run(role)
        r_role.font.size = Pt(8.5)
        r_role.font.color.rgb = GRAY_TEXT

    out_path = "/Users/jonathanpalacios/Downloads/wms-formatex-v2/requerimientos/atencion_al_cliente/REGLAS_DE_NEGOCIO_ATC_FORMATEX.docx"
    doc.save(out_path)
    print(f"Document saved successfully: {out_path} ({os.path.getsize(out_path)} bytes)")

if __name__ == "__main__":
    generate_atc_docx()
