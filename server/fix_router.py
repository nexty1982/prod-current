import re

# Read the router file
with open('src/features/routerMenuStudio/router.ts', 'r') as f:
    content = f.read()

# Fix the GET /routes endpoint
routes_pattern = r"router\.get\('/routes', ah\(async \(req: any, res: any, next: any\) => \{\s*const success = req\.validationResult\?\.success;\s*if \(!success\) \{[^}]+\}\s*const routes = await routesService\.list\(req\.validationResult\?\.data \|\| \{\}\);\s*res\.json\(\{ ok: true, routes \}\);\s*\}\)\);"

replacement = """router.get('/routes', ah(async (req: any, res: any, next: any) => {
  // GET /routes doesn't need validation - just use query parameters as-is
  const routes = await routesService.list(req.query || {});
  res.json({ ok: true, routes });
}));"""

content = re.sub(routes_pattern, replacement, content, flags=re.DOTALL)

# Fix the GET /menus endpoint too
menus_pattern = r"router\.get\('/menus', ah\(async \(req: any, res: any, next: any\) => \{\s*const success = req\.validationResult\?\.success;\s*if \(!success\) \{[^}]+\}\s*const menus = await menusService\.list\(req\.validationResult\?\.data \|\| \{\}\);\s*res\.json\(\{ ok: true, menus \}\);\s*\}\)\);"

menus_replacement = """router.get('/menus', ah(async (req: any, res: any, next: any) => {
  // GET /menus doesn't need validation - just use query parameters as-is
  const menus = await menusService.list(req.query || {});
  res.json({ ok: true, menus });
}));"""

content = re.sub(menus_pattern, menus_replacement, content, flags=re.DOTALL)

# Write the fixed content back
with open('src/features/routerMenuStudio/router.ts', 'w') as f:
    f.write(content)

print("Router file fixed!")
