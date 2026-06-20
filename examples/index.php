<?php

declare(strict_types=1);

/**
 * Live demo served by the real Nette Latte engine.
 *
 * Renders examples/page.phtml, which {embed}s the transpiled components in
 * examples/components/. Serve it with:
 *
 *   composer install
 *   php -S localhost:8080 examples/index.php
 */

require __DIR__ . '/vendor/autoload.php';

$latte = new Latte\Engine();
$latte->setTempDirectory(__DIR__ . '/temp');
$latte->setLoader(new Latte\Loaders\FileLoader(__DIR__));

header('Content-Type: text/html; charset=utf-8');
echo $latte->renderToString('page.phtml');
