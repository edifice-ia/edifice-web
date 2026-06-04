# Audit technique - Atelier Pinterest

Date d'audit : 2026-06-04

## Perimetre

Objectif : preparer un Atelier Pinterest web separe de l'Atelier Video, sans recreer la logique Pinterest locale deja presente dans `D:\Edifice_IA`.

Regle suivie : aucune modification des agents locaux, aucun secret lu ou expose. Les variables d'environnement ci-dessous sont listees par nom uniquement.

## Etat actuel cote web Next.js

Le projet web contient deja une surface Pinterest minimale :

- `app/interface/publishers/pinterest/page.tsx` : page placeholder "Pinterest Publisher", sans logique metier.
- `lib/cockpit/modules.ts` : module `publisher-pinterest` et hub `publisher-pinterest-hub`.
- `lib/oauth/providers.ts` : provider OAuth `pinterest`, en placeholder, avec scopes `boards:read`, `pins:read`, `pins:write`.
- `app/api/oauth/pinterest/status/route.ts` et `lib/server/oauth/status-payloads.ts` : statut OAuth Pinterest en mode `review`, avec avertissement "aucune publication automatique".
- `lib/server/cockpit/read-only-state.ts`, `lib/cockpit/platform-status.ts`, `lib/cockpit/observatory.ts`, `lib/resources/project-resources.ts` : Pinterest apparait dans l'observatoire, les ressources et l'assistant global.

Conclusion web : l'espace existe deja comme placeholder securise. Il ne faut pas partir d'une page neuve, mais enrichir progressivement cette route.

## Etat actuel des agents Pinterest locaux

Les agents Pinterest sont declares dans `D:\Edifice_IA\agents_registry.json` :

- `Pinterest Visual Sorter` : `agents/Pinterest/pinterest_sorter.py`
- `Pinterest Generator` : `agents/Pinterest/pinterest_generator.py`
- `Pinterest Selector` : `agents/Pinterest/pinterest_select_visual.py`
- `Pinterest Create Pin` : `agents/Pinterest/pinterest_create_pin.py`
- `Pinterest Publish` : `agents/Pinterest/pinterest_publish.py`

Le pipeline local documente dans `D:\Edifice_IA\documentation\documentation_agents.md` suit deja cette chaine :

1. Tri visuels.
2. Generation posts Pinterest.
3. Selection ou generation de visuels.
4. Creation des pins finaux.
5. Publication Pinterest.

## Fichiers Pinterest detectes

Agents :

- `D:\Edifice_IA\agents\Pinterest\pinterest_sorter.py`
- `D:\Edifice_IA\agents\Pinterest\pinterest_generator.py`
- `D:\Edifice_IA\agents\Pinterest\pinterest_select_visual.py`
- `D:\Edifice_IA\agents\Pinterest\pinterest_create_pin.py`
- `D:\Edifice_IA\agents\Pinterest\pinterest_publish.py`

Documentation et memoire :

- `D:\Edifice_IA\docs\CARTOGRAPHIE_TECHNIQUE.md`
- `D:\Edifice_IA\documentation\documentation_agents.md`
- `D:\Edifice_IA\memoire\edifice_summary.md`
- `D:\Edifice_IA\memoire\agents_documentation_summary.json`

Projets et donnees :

- `D:\Edifice_IA\projets\Pinterest\edifice_discipline\`
- `D:\Edifice_IA\projets\Pinterest\solution_sommeil\`
- CSV globaux dans `D:\Edifice_IA\projets\Pinterest\`
- Dossiers par compte : `VISUALS`, `VISUALS_SORTED`, `PINS_READY`, `SCRIPT`, `ARCHIVE`, `Tunnel`

Volumes observes :

- `edifice_discipline` : 30 posts, 137 visuels indexes, 30 pins crees, 27 pins `ready_to_publish`, 3 `dry_run`.
- `solution_sommeil` : 30 posts, 80 visuels indexes, 30 pins crees, 27 pins `ready_to_publish`, 3 `dry_run`.
- Global : 60 posts, 60 pins crees, 54 pins `ready_to_publish`, 6 `dry_run`.
- Assets projet Pinterest : 14 CSV, 8 TXT, 374 images (`.jpg` + `.png`) et 1 PDF.

## Prompts existants detectes

`pinterest_generator.py` contient un prompt systeme et un prompt utilisateur structurants :

- role : expert Pinterest SEO francophone.
- contraintes : JSON strict, titres 35-80 caracteres, hooks 6-14 mots, `pin_text` 9 mots maximum, descriptions 120-250 caracteres, 5-8 mots-cles separes par `;`.
- garde-fous : pas de titres dupliques, pas d'emojis dans les champs principaux, pas de promesses exagerees, pas de phrases trop longues, pas de titres putaclics.
- mapping force theme -> categorie visuelle -> tableau Pinterest.
- comptes couverts : `edifice_discipline` et `solution_sommeil`.

`pinterest_select_visual.py` contient les prompts d'image Pinterest :

- `build_image_prompt(post, account_config)` construit un prompt 2:3 vertical.
- Contraintes image : fond Pinterest, composition propre, espace pour texte, pas de texte, pas de logo, pas de watermark, pas de visage identifiable.
- Styles par compte : discipline sombre/productivite premium ; sommeil calme/wellness.
- Categories visuelles par compte, avec prompts de scene associes.

`pinterest_create_pin.py` contient la logique de rendu texte :

- format final : `1000x1500`, ratio Pinterest 2:3.
- templates : `CENTER_TOP`, `LEFT_BLOCK`, `LOWER_THIRD`.
- texte choisi : `pin_text`, sinon `hook`, sinon `title`.
- overlay, panneau floute, typographies Windows, label de marque par compte.

## Fonctions reutilisables

Generation de posts :

- `build_openai_prompt`
- `validate_ai_post`
- `generate_posts_with_openai`
- `enrich_posts_with_local_fields`
- `process_account`
- `create_global_csv`

Tri et bibliotheque visuelle :

- `detect_category`
- `scan_images`
- `copy_image_to_category`
- `create_csv_index`
- `process_account`

Selection / generation image :

- `scan_visuals_sorted_dir`
- `rebuild_visuals_index_from_sorted_dir`
- `get_available_visuals`
- `choose_least_used_visual`
- `filter_visuals_under_reuse_limit`
- `build_image_prompt`
- `generate_image_with_openai`
- `save_generated_visual`
- `select_visual_for_post`
- `write_visual_selection_txt`

Creation pin final :

- `crop_to_pinterest_ratio`
- `choose_template`
- `render_template_center_top`
- `render_template_lower_third`
- `render_template_left_block`
- `draw_brand_label`
- `create_pin_image`
- `create_global_final_pins_index`

Publication :

- `get_pinterest_token_for_account`
- `pinterest_api_request`
- `get_boards_from_pinterest`
- `resolve_board_id`
- `upload_image_to_pinterest_media`
- `create_pin_with_media`
- `create_pinterest_pin`
- `publish_row`
- `process_account`
- `create_global_publishing_queue`

Progression commune :

- `agents/shared/progress.py` expose `progress(percent, message)` et `step(message)`, deja compatible avec un cockpit qui lit stdout.

## Workflows reutilisables

Workflow actuel local :

```text
VISUALS
-> pinterest_sorter.py
-> visuals_index.csv / VISUALS_SORTED
-> pinterest_generator.py
-> posts_queue.csv
-> pinterest_select_visual.py
-> posts_with_visuals.csv
-> pinterest_create_pin.py
-> PINS_READY / final_pins_index.csv
-> publishing_queue.csv
-> pinterest_publish.py
-> dry_run ou publication reelle
```

Workflow cible web a court terme :

```text
Atelier Pinterest web
-> lit les index existants
-> affiche posts / visuels / pins / queue
-> lance un agent local via une couche d'orchestration controlee
-> capture stdout PROGRESS
-> stocke l'etat dans Supabase ou dans une table de jobs
-> garde publication reelle bloquee par validation humaine
```

## Variables d'environnement attendues

Variables locales Pinterest detectees dans les agents Python :

- `OPENAI_API_KEY`
- `OPENAI_IMAGE_MODEL`
- `OPENAI_TIMEOUT_SECONDS`
- `IMAGE_SIZE`
- `PINTEREST_PROJECT_DIR`
- `PINTEREST_API_BASE_URL`
- `PINTEREST_DRY_RUN`
- `PINTEREST_MAX_PINS_PER_RUN`
- `PINTEREST_LIMIT_MODE`
- `PINTEREST_ACCESS_TOKEN_EDIFICE_DISCIPLINE`
- `PINTEREST_ACCESS_TOKEN_SOLUTION_SOMMEIL`
- `GENERATE_MISSING_VISUALS`
- `GENERATE_IF_REUSE_LIMIT_REACHED`
- `MAX_VISUAL_REUSE_PER_ACCOUNT`
- `MAX_IMAGES_GENERATED_PER_RUN`
- `RESET_VISUAL_SELECTION`
- `GLOBAL_VISUALS_INDEX_CSV`
- `GLOBAL_POSTS_QUEUE_CSV`
- `GLOBAL_POSTS_WITH_VISUALS_CSV`
- `GLOBAL_FINAL_PINS_INDEX_CSV`
- `GLOBAL_PUBLISHING_QUEUE_CSV`
- `EDIFICE_DISCIPLINE_DIR`
- `EDIFICE_DISCIPLINE_VISUALS_DIR`
- `EDIFICE_DISCIPLINE_VISUALS_SORTED_DIR`
- `EDIFICE_DISCIPLINE_SCRIPT_DIR`
- `EDIFICE_DISCIPLINE_PINS_READY_DIR`
- `EDIFICE_DISCIPLINE_ARCHIVE_DIR`
- `EDIFICE_DISCIPLINE_SCRIPT_TXT`
- `EDIFICE_DISCIPLINE_POSTS_QUEUE_CSV`
- `EDIFICE_DISCIPLINE_VISUALS_INDEX_CSV`
- `EDIFICE_DISCIPLINE_POSTS_WITH_VISUALS_CSV`
- `EDIFICE_DISCIPLINE_VISUAL_SELECTION_TXT`
- `EDIFICE_DISCIPLINE_FINAL_PINS_INDEX_CSV`
- `EDIFICE_DISCIPLINE_FINAL_PINS_TXT`
- `EDIFICE_DISCIPLINE_PUBLISHING_QUEUE_CSV`
- `EDIFICE_DISCIPLINE_PUBLISHING_QUEUE_TXT`
- `SOLUTION_SOMMEIL_DIR`
- `SOLUTION_SOMMEIL_VISUALS_DIR`
- `SOLUTION_SOMMEIL_VISUALS_SORTED_DIR`
- `SOLUTION_SOMMEIL_SCRIPT_DIR`
- `SOLUTION_SOMMEIL_PINS_READY_DIR`
- `SOLUTION_SOMMEIL_ARCHIVE_DIR`
- `SOLUTION_SOMMEIL_SCRIPT_TXT`
- `SOLUTION_SOMMEIL_POSTS_QUEUE_CSV`
- `SOLUTION_SOMMEIL_VISUALS_INDEX_CSV`
- `SOLUTION_SOMMEIL_POSTS_WITH_VISUALS_CSV`
- `SOLUTION_SOMMEIL_VISUAL_SELECTION_TXT`
- `SOLUTION_SOMMEIL_FINAL_PINS_INDEX_CSV`
- `SOLUTION_SOMMEIL_FINAL_PINS_TXT`
- `SOLUTION_SOMMEIL_PUBLISHING_QUEUE_CSV`
- `SOLUTION_SOMMEIL_PUBLISHING_QUEUE_TXT`

Variables web Pinterest detectees :

- `PINTEREST_CLIENT_ID`
- `PINTEREST_CLIENT_SECRET`
- `PINTEREST_REDIRECT_URI`
- `OAUTH_STATE_SECRET`

Ne pas afficher les valeurs. Pour le web, preferer Supabase/Vercel env + token store existant plutot que recopier le `.env` local.

## Dependances Python eventuelles

Dependances importees ou mentionnees :

- `openai`
- `python-dotenv`
- `Pillow` / `PIL`
- bibliotheque standard : `argparse`, `base64`, `csv`, `json`, `os`, `pathlib`, `urllib`, `mimetypes`, `datetime`, `random`, `re`, `shutil`, `collections`, `dataclasses`

Risque Windows :

- `pinterest_create_pin.py` charge des polices dans `C:\Windows\Fonts`.
- Les agents pointent vers `D:\Edifice_IA\agents\Pinterest\.env`.
- Plusieurs chemins sont Windows absolus. Une execution Vercel directe n'est donc pas adaptee.

## Points deja fonctionnels

- Generation editoriale Pinterest par compte avec JSON schema strict.
- Bibliotheque visuelle locale triee par categories.
- Selection automatique de visuels avec limitation de reutilisation.
- Generation d'images manquantes via OpenAI, optionnelle et limitee par run.
- Creation des pins finaux 2:3 avec templates et overlay.
- Index CSV par etape et index globaux.
- Queue de publication avec `scheduled_date`, `scheduled_time`, `publish_status`, URL Pinterest, notes.
- Publication Pinterest via API v5, avec dry-run par defaut.
- Detection de boards via API Pinterest avant publication reelle.
- Interface locale Streamlit qui affiche deja des actions Pinterest.

## Points manquants

- Pas d'Atelier Pinterest web complet : seulement placeholder.
- Pas de table Supabase dediee aux pins, boards, jobs ou statistiques Pinterest.
- Pas de wrapper serveur web pour lancer les agents locaux depuis Next.js.
- Pas de synchronisation fiable CSV -> Supabase.
- Pas de scoring Pinterest dedie. Le generateur valide SEO/format, mais ne produit pas de score exploitable comme l'Atelier Video.
- Pas de scheduler Pinterest autonome. Le `multi_scheduler` local expose une option de registre `pinterest`, mais le code ne normalise que TikTok, Instagram et YouTube. La planification Pinterest existe surtout via colonnes `scheduled_date` / `scheduled_time` dans `publishing_queue.csv`.
- Pas de statistiques Pinterest web : impressions, saves, clicks, CTR, board performance.
- Pas de gestion web des boards Pinterest au-dela du statut OAuth.

## Risques techniques

- Publication reelle : doit rester bloquee par dry-run et validation humaine.
- Secrets : ne pas deplacer les tokens locaux vers le client web ; utiliser le token store serveur.
- Execution Vercel : les agents Python locaux dependent de fichiers Windows et de `D:\Edifice_IA`; ils doivent tourner localement, dans un worker dedie, ou etre progressivement portes en services serveur.
- Encodage : plusieurs anciens fichiers affichent des caracteres mal encodes. A corriger avant affichage web public.
- CSV comme source de verite : pratique localement, fragile pour multi-utilisateur, concurrence et historique.
- OpenAI images : cout, latence, quotas et retries doivent etre controles.
- Pinterest API review : le web indique encore le mode review ; ne pas activer publication tant que l'etat externe n'est pas clair.

## Architecture cible simple

```text
Atelier Pinterest
+-- Generation Pin
+-- Bibliotheque Pinterest
+-- Generation Image Pinterest
+-- Publication Pinterest
+-- Planification Pinterest
+-- Statistiques Pinterest
```

### Generation Pin

Source a reutiliser : `pinterest_generator.py`.

Premiere version web : formulaire compte + nombre de posts, appel d'un job local, affichage de `posts_queue.csv`.

Migration progressive : extraire `build_openai_prompt`, `validate_ai_post` et `generate_posts_with_openai` dans un module service partageable, puis persister en Supabase.

### Bibliotheque Pinterest

Sources a reutiliser : `pinterest_sorter.py`, `visuals_index.csv`, `VISUALS_SORTED`.

Premiere version web : lecture seule des categories, compte, filename, statut, utilisabilite.

Migration progressive : table `pinterest_assets` ou reutilisation adaptee de `content_assets` avec scope `platform = pinterest`.

### Generation Image Pinterest

Sources a reutiliser : `pinterest_select_visual.py`, surtout `build_image_prompt`, `generate_image_with_openai`, `save_generated_visual`.

Premiere version web : bouton "demander generation" en mode job, avec quotas et dry-run visuel.

Migration progressive : separer selection existante et generation OpenAI, puis brancher le stockage media web/Supabase.

### Publication Pinterest

Source a reutiliser : `pinterest_publish.py`.

Premiere version web : afficher queue, dry-run, erreurs, liens Pinterest.

Migration progressive : route serveur pour dry-run seulement, puis publication reelle derriere confirmation forte et statut OAuth valide.

### Planification Pinterest

Source partielle : `publishing_queue.csv` contient deja `scheduled_date` et `scheduled_time`.

Premiere version web : editer date/heure dans une future table ou queue, sans publier.

Migration progressive : creer un scheduler Pinterest dedie au lieu d'etendre le `multi_scheduler` Shorts.

### Statistiques Pinterest

Source actuelle : aucune fonction detectee.

Premiere version web : placeholder "non connecte".

Migration progressive : ajouter lecture API analytics Pinterest lorsque les permissions et la review sont OK.

## Proposition de migration progressive

1. Lecture seule web : afficher les CSV Pinterest existants dans `/interface/publishers/pinterest`, sans lancer d'agent.
2. Job runner local : creer une route serveur ou un petit service local qui lance les agents Python autorises, capture `PROGRESS`, et ecrit un journal.
3. Supabase mirror : importer les CSV en tables `pinterest_posts`, `pinterest_assets`, `pinterest_pins`, `pinterest_publication_queue`.
4. Actions controlees : generation posts, selection visuel, creation pin, dry-run publication.
5. Publication reelle : activer seulement apres OAuth/token store stable, review Pinterest OK, confirmation humaine et limite par run.
6. Analytics : connecter les statistiques Pinterest en lecture seule.

## Recommandation immediate

Ne pas developper l'interface complete tout de suite. La prochaine etape logique est de creer une vue web lecture seule qui lit un snapshot des index Pinterest, afin de valider le modele de donnees avant de lancer des agents depuis Next.js.

Route cible existante a enrichir : `app/interface/publishers/pinterest/page.tsx`.
