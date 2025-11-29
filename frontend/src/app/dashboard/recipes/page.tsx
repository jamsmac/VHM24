'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Recipe {
  id: string;
  nomenclature_id: string;
  recipe_name: string;
  recipe_type: 'primary' | 'alternative' | 'test';
  serving_size: number;
  serving_unit: string;
  total_cost: number;
  is_active: boolean;
  version: number;
  nomenclature?: {
    id: string;
    name: string;
    sku: string;
  };
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'primary' | 'alternative' | 'test'>('all');

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await axios.get('http://localhost:3000/recipes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecipes(response.data);
    } catch (error) {
      console.error('Failed to fetch recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecipes = recipes.filter((r) => {
    if (filter === 'all') {return true;}
    return r.recipe_type === filter;
  });

  const getRecipeTypeBadge = (type: string) => {
    switch (type) {
      case 'primary':
        return <Badge variant="success">Основной</Badge>;
      case 'alternative':
        return <Badge variant="warning">Альтернативный</Badge>;
      case 'test':
        return <Badge variant="default">Тестовый</Badge>;
      default:
        return <Badge variant="default">{type}</Badge>;
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Рецепты напитков</h1>
          <p className="text-gray-600 mt-1">
            Управление рецептами и составом ингредиентов
          </p>
        </div>
        <Link href="/recipes/create">
          <Button>+ Создать рецепт</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={filter === 'all' ? 'primary' : 'secondary'}
          onClick={() => setFilter('all')}
        >
          Все ({recipes.length})
        </Button>
        <Button
          variant={filter === 'primary' ? 'primary' : 'secondary'}
          onClick={() => setFilter('primary')}
        >
          Основные ({recipes.filter((r) => r.recipe_type === 'primary').length})
        </Button>
        <Button
          variant={filter === 'alternative' ? 'primary' : 'secondary'}
          onClick={() => setFilter('alternative')}
        >
          Альтернативные ({recipes.filter((r) => r.recipe_type === 'alternative').length})
        </Button>
        <Button
          variant={filter === 'test' ? 'primary' : 'secondary'}
          onClick={() => setFilter('test')}
        >
          Тестовые ({recipes.filter((r) => r.recipe_type === 'test').length})
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          <p className="mt-2 text-gray-600">Загрузка...</p>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Название рецепта
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Продукт
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Тип
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Размер порции
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Себестоимость
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Версия
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRecipes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Нет данных для отображения
                  </td>
                </tr>
              ) : (
                filteredRecipes.map((recipe) => (
                  <tr key={recipe.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {recipe.recipe_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {recipe.nomenclature?.name || '-'}
                      {recipe.nomenclature?.sku && (
                        <span className="text-gray-500 text-xs ml-2">
                          ({recipe.nomenclature.sku})
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getRecipeTypeBadge(recipe.recipe_type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {recipe.serving_size} {recipe.serving_unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {recipe.total_cost.toLocaleString()} UZS
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      v{recipe.version}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Badge variant={recipe.is_active ? 'success' : 'default'}>
                        {recipe.is_active ? 'Активен' : 'Неактивен'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/recipes/${recipe.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Редактировать
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
