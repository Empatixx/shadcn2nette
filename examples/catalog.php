<?php

declare(strict_types=1);

/**
 * Component catalog served by the real Nette Latte engine.
 *
 *   composer install -d examples
 *   php -S localhost:8080 examples/catalog.php
 *
 * Browse every transpiled component at http://localhost:8080 and pick one from
 * the sidebar. Each entry shows a live Latte-rendered preview and its .phtml source.
 */

require __DIR__ . '/vendor/autoload.php';

$root = __DIR__;
$componentsDir = $root . '/components';

$latte = new Latte\Engine();
$latte->setTempDirectory($root . '/temp');
$latte->setLoader(new Latte\Loaders\FileLoader($root));

$manifest = json_decode((string) file_get_contents($root . '/catalog/components.json'), true);
$names = array_map(static fn(array $g): string => $g['name'], $manifest);

$titleize = static fn(string $s): string => ucwords(str_replace('-', ' ', $s));

header('Content-Type: text/html; charset=utf-8');

// Showcase route: the hand-composed kitchen-sink page.
if (($_GET['view'] ?? '') === 'showcase') {
    echo $latte->renderToString('page.phtml');
    exit;
}

// Interactive route: components composed with the Alpine.js layer working.
if (($_GET['view'] ?? '') === 'interactive') {
    echo $latte->renderToString('interactive.phtml');
    exit;
}

$selected = $_GET['c'] ?? 'button';
if (!in_array($selected, $names, true)) {
    $selected = $names[0];
}

$group = ['files' => []];
foreach ($manifest as $g) {
    if ($g['name'] === $selected) {
        $group = $g;
        break;
    }
}

$entries = [];
foreach ($group['files'] as $file) {
    $src = (string) file_get_contents($componentsDir . '/' . $file);
    $hasContent = str_contains($src, '{block content}');
    $rel = 'components/' . $file;
    $label = $titleize(substr($file, 0, -6));
    try {
        $preview = $hasContent
            ? $latte->renderToString('_embed.latte', ['t' => $rel, 'label' => $label])
            : $latte->renderToString('_include.latte', ['t' => $rel]);
    } catch (\Throwable $e) {
        $preview = '<p class="text-sm text-destructive">Preview unavailable.</p>';
    }
    $entries[] = ['file' => $file, 'label' => $label, 'preview' => $preview, 'source' => $src];
}

echo $latte->renderToString('catalog/layout.latte', [
    'names' => $names,
    'selected' => $selected,
    'title' => $titleize($selected),
    'entries' => $entries,
]);
