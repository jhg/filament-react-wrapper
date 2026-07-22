<?php

namespace HadyFayed\ReactWrapper\Blade;

use Illuminate\Support\Facades\Blade;
use HadyFayed\ReactWrapper\Services\ReactComponentRegistry;
use HadyFayed\ReactWrapper\Factories\ReactComponentFactory;

class ReactDirective
{
    protected ReactComponentRegistry $registry;
    protected ReactComponentFactory $factory;

    public function __construct(ReactComponentRegistry $registry, ReactComponentFactory $factory)
    {
        $this->registry = $registry;
        $this->factory = $factory;
    }

    public function register(): void
    {
        $this->registerReactDirective();
        $this->registerReactComponentDirective();
        $this->registerReactPropsDirective();
        $this->registerReactConfigDirective();
    }

    protected function registerReactDirective(): void
    {
        Blade::directive('react', function ($expression) {
            return "<?php echo app('react-wrapper.factory')->render({$expression}); ?>";
        });
    }

    protected function registerReactComponentDirective(): void
    {
        Blade::directive('reactComponent', function ($expression) {
            $args = $this->parseDirectiveArguments($expression);
            
            if (count($args) < 1) {
                throw new \InvalidArgumentException('reactComponent directive requires at least a component name');
            }
            
            $component = $args[0];
            $props = $args[1] ?? '[]';
            $config = $args[2] ?? '[]';
            
            return "<?php echo app('react-wrapper.factory')->render({$component}, {$props}, {$config}); ?>";
        });
    }

    protected function registerReactPropsDirective(): void
    {
        Blade::directive('reactProps', function ($expression) {
            return "<?php echo 'data-react-props=\"' . htmlspecialchars(json_encode({$expression}), ENT_QUOTES, 'UTF-8') . '\"'; ?>";
        });
    }

    protected function registerReactConfigDirective(): void
    {
        Blade::directive('reactConfig', function ($expression) {
            return "<?php echo 'data-react-config=\"' . htmlspecialchars(json_encode({$expression}), ENT_QUOTES, 'UTF-8') . '\"'; ?>";
        });
    }

    protected function parseDirectiveArguments(string $expression): array
    {
        $expression = trim($expression);

        if ($expression === '') {
            return [];
        }

        // Blade passes the full directive expression, including its outer
        // parentheses. Remove exactly one balanced pair; trim('()') would
        // silently remove meaningful parentheses from an argument.
        if ($expression[0] === '(' && $this->hasSingleOuterPair($expression)) {
            $expression = trim(substr($expression, 1, -1));
        }

        if ($expression === '') {
            return [];
        }

        $args = [];
        $currentArg = '';
        $depth = 0;
        $quote = null;
        $escaped = false;

        for ($i = 0, $length = strlen($expression); $i < $length; $i++) {
            $char = $expression[$i];

            if ($quote !== null) {
                $currentArg .= $char;
                if ($escaped) {
                    $escaped = false;
                } elseif ($char === '\\') {
                    $escaped = true;
                } elseif ($char === $quote) {
                    $quote = null;
                }
                continue;
            }

            if ($char === '"' || $char === "'") {
                $quote = $char;
            } elseif (in_array($char, ['[', '(', '{'], true)) {
                $depth++;
            } elseif (in_array($char, [']', ')', '}'], true)) {
                $depth--;
            } elseif ($char === ',' && $depth === 0) {
                $args[] = trim($currentArg);
                $currentArg = '';
                continue;
            }

            $currentArg .= $char;
        }

        if ($quote !== null || $depth !== 0) {
            throw new \InvalidArgumentException('Unbalanced quotes or brackets in reactComponent directive.');
        }

        if (trim($currentArg) !== '') {
            $args[] = trim($currentArg);
        }

        return $args;
    }

    protected function hasSingleOuterPair(string $expression): bool
    {
        $depth = 0;
        $quote = null;
        $escaped = false;

        for ($i = 0, $length = strlen($expression); $i < $length; $i++) {
            $char = $expression[$i];

            if ($quote !== null) {
                if ($escaped) {
                    $escaped = false;
                } elseif ($char === '\\') {
                    $escaped = true;
                } elseif ($char === $quote) {
                    $quote = null;
                }
                continue;
            }

            if ($char === '"' || $char === "'") {
                $quote = $char;
            } elseif ($char === '(') {
                $depth++;
            } elseif ($char === ')') {
                $depth--;
                if ($depth === 0 && $i !== $length - 1) {
                    return false;
                }
            } else {
                continue;
            }
        }

        return $depth === 0 && $quote === null;
    }
}
