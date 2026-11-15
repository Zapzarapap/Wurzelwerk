"""Zusatzrampen für die Region Gewächshaus. [outline, shade, base, light, highlight]"""

EXTRA = {
    # Beeterde (dunkler und feuchter als der Topf-Boden "soil")
    "gh_earth":          ["#1c1410", "#2c1e16", "#3e2a1e", "#54382a", "#704e3a"],

    # Tomaten
    "gh_tomato_red":     ["#4e1418", "#9a2224", "#d63a2c", "#f06a48", "#fcae88"],
    "gh_tomato_yellow":  ["#5a3c0c", "#b07a14", "#ecb424", "#f8d450", "#fdf090"],
    "gh_tomato_green":   ["#243a1c", "#3e6a2c", "#6a9a3c", "#92bc54", "#bcd878"],

    # Gurke
    "gh_cuke":           ["#16301c", "#245a2c", "#3a8238", "#62aa48", "#9ad26a"],

    # Basilikum (glänzend, leicht gelbstichiges Grün)
    "gh_basil":          ["#1c3c22", "#2c6a30", "#4a9a3a", "#82c850", "#c4ee86"],

    # Melone: helle Schale + dunkle Streifen
    "gh_melon":          ["#2c4a22", "#5a8a38", "#8cb850", "#bcd878", "#e2f2ac"],
    "gh_melon_stripe":   ["#14301a", "#1e5028", "#2c7038", "#3e9048", "#62b45a"],

    # Kürbis
    "gh_pumpkin_orange": ["#5a2410", "#a8481a", "#e8762a", "#f8a048", "#fdcc84"],
    "gh_pumpkin_green":  ["#1a3a2a", "#2a5e40", "#3e8456", "#5ea872", "#92cc98"],
    "gh_pumpkin_beige":  ["#6a5030", "#b49460", "#d8bc84", "#ecd8a8", "#f8f0d0"],

    # Chili
    "gh_chili_red":      ["#4a1018", "#8e1c22", "#cc2a24", "#ec5236", "#fa8c64"],
    "gh_chili_yellow":   ["#5a420c", "#b08414", "#f0c020", "#fcdc50", "#fef69a"],
    "gh_chili_green":    ["#1e4a22", "#3c7c34", "#5ea844", "#8cd05c", "#c0ee90"],

    # unreife Früchte: heller/gelblicher als das Laub, damit sie sich abheben
    "gh_tomato_unripe":  ["#2e4a1a", "#5e8a2e", "#90bc46", "#b8d86a", "#e2f0a4"],
    "gh_chili_unripe":   ["#2c4a16", "#5a8a24", "#8cbc38", "#b6dc5c", "#e4f6a0"],
    "gh_chili_orange":   ["#5a2410", "#a8481a", "#ec7424", "#f8a044", "#fdd084"],

    # Butternut (glatt, sandbeige-orange)
    "gh_butternut":      ["#6a4422", "#b07a40", "#dca462", "#f0c688", "#fae4b8"],

    # Erdbeere
    "gh_strawberry":     ["#4a0e1a", "#a01a26", "#dc2c30", "#f45a48", "#fca088"],
    "gh_strawberry_raw": ["#4a5a2a", "#98ac58", "#d0dc96", "#ecf2c4", "#fafde6"],  # unreif, weißlich-grün

    # Paprika (glänzend, sehr helle Glanzlichter)
    "gh_paprika_red":    ["#4a0c12", "#9a1a1e", "#d8302a", "#f26446", "#fec4a8"],
    "gh_paprika_yellow": ["#5a400a", "#b88a14", "#f2c624", "#fce45a", "#fffad0"],
    "gh_paprika_orange": ["#5a240a", "#b04c14", "#f07a1e", "#fca64a", "#fee0b4"],
    "gh_paprika_green":  ["#163a14", "#2e6a20", "#4a9a2c", "#76c044", "#d0f0a0"],

    # Aubergine: Frucht dunkellila glänzend, Laub graugrün, Kelch grau-grün
    "gh_aubergine":      ["#1c0c26", "#3a1c4e", "#572c70", "#7a4896", "#c4a4e0"],
    "gh_eggplant_leaf":  ["#24342a", "#3c5644", "#5a7a5e", "#7e9e7c", "#a8c2a0"],

    # Zucchini: dunkelgrün mit hellen Sprenkeln
    "gh_zucchini":       ["#10301a", "#1f5428", "#327a38", "#56a04a", "#a6d886"],

    # Mais
    "gh_corn_leaf":      ["#21401e", "#38682c", "#56963a", "#82bc4e", "#b8dc78"],
    "gh_corn_kernel":    ["#6a480c", "#c0861a", "#eebc30", "#f8d85a", "#fdf09c"],
    "gh_corn_husk":      ["#34502a", "#62883e", "#94b65c", "#bed686", "#e2eeb4"],
    "gh_corn_silk":      ["#5a2e14", "#8e5024", "#c27a3c", "#dca462", "#f0cc90"],
    "gh_corn_tassel":    ["#66522a", "#a68a48", "#ccb068", "#e4cc8a", "#f4e6b6"],

    # Karotte: fein gefiedertes Kraut, Rübe in Orange/Gelb/Lila
    "gh_carrot_leaf":    ["#1c3c1c", "#2c6a2a", "#48983a", "#78c24e", "#b4e278"],
    "gh_carrot":         ["#5a220c", "#ac4612", "#ea7620", "#faa444", "#fed28c"],
    "gh_carrot_yellow":  ["#5a400c", "#b48416", "#eebc2a", "#fad85a", "#fef2a4"],
    "gh_carrot_purple":  ["#2a0c26", "#561a48", "#82306c", "#a8508e", "#d48cbc"],

    # Kopfsalat: hellgrün, Herz noch heller/gelblicher; rote Sorte für die äußeren Blätter
    "gh_lettuce":        ["#2a481c", "#4a7c2c", "#76ae40", "#a2d460", "#d2ee96"],
    "gh_lettuce_heart":  ["#3a5420", "#6a9634", "#9cc84c", "#c4e274", "#ecf8b8"],
    "gh_lettuce_red":    ["#36101e", "#681e34", "#922f48", "#b8525c", "#dc8c84"],

    # Erbse: bläulich-bereiftes Laub, Schoten frisch grün
    "gh_pea":            ["#1c3a2a", "#2c5e40", "#468a58", "#72b276", "#a8d8a0"],
    "gh_pea_pod":        ["#2a4a16", "#5a8e2a", "#86be40", "#b0de62", "#e0f6a6"],

    # Radieschen
    "gh_radish":         ["#4a0c1e", "#901a32", "#d0304a", "#ee6070", "#fca8b0"],
    "gh_radish_pink":    ["#5a1c36", "#a4405e", "#dc7090", "#f4a0b8", "#fcd0dc"],
    "gh_radish_purple":  ["#280c2e", "#4e1c58", "#782e84", "#a050aa", "#d08cd6"],
    "gh_radish_white":   ["#5e5a5c", "#a8a2a2", "#dad6d2", "#f2f0ea", "#ffffff"],

    # Rosmarin: graugrüne Nadeln, verholzte Zweige, hellblaue Blüten
    "gh_rosemary":       ["#1c2e26", "#30483c", "#4e6a58", "#78967e", "#aec4aa"],
    "gh_rosemary_wood":  ["#2e2016", "#4c3626", "#6c5038", "#8e6e50", "#b29470"],
    "gh_petal_lightblue":["#283c6c", "#4c6eb2", "#7ca2e0", "#a8c8f2", "#dae8fc"],
}
